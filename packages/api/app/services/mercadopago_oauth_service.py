"""Mercado Pago OAuth marketplace — connect sellers per establishment."""

import json
import secrets
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.core.redis import get_redis
from app.models.establishment import Establishment
from app.models.system_settings import SettingsKeys
from app.services.settings_service import SettingsService

logger = get_logger(__name__)

MP_AUTH_URL = "https://auth.mercadopago.com/authorization"
MP_TOKEN_URL = "https://api.mercadopago.com/oauth/token"
MP_API = "https://api.mercadopago.com"

OAUTH_STATE_TTL = 600  # 10 minutes


class MercadoPagoOAuthService:
    """OAuth marketplace flow for establishment sellers."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.settings = SettingsService(db)

    async def _oauth_config(self) -> tuple[str, str, str]:
        client_id = await self.settings.get(SettingsKeys.MERCADOPAGO_CLIENT_ID) or ""
        client_secret = await self.settings.get(SettingsKeys.MERCADOPAGO_CLIENT_SECRET) or ""
        redirect_uri = await self.settings.get(SettingsKeys.MERCADOPAGO_OAUTH_REDIRECT_URI) or ""
        if not client_id or not client_secret or not redirect_uri:
            raise ValueError(
                "OAuth Mercado Pago não configurado. "
                "Defina mercadopago_client_id, mercadopago_client_secret e "
                "mercadopago_oauth_redirect_uri no Admin → Pagamentos."
            )
        return client_id, client_secret, redirect_uri

    async def _store_oauth_state(self, state: str, establishment_id: UUID, user_id: UUID) -> None:
        payload = json.dumps(
            {"establishment_id": str(establishment_id), "user_id": str(user_id)}
        )
        redis = await get_redis()
        await redis.setex(f"mp_oauth:{state}", OAUTH_STATE_TTL, payload)

    async def _pop_oauth_state(self, state: str) -> dict[str, str] | None:
        redis = await get_redis()
        raw = await redis.get(f"mp_oauth:{state}")
        if not raw:
            return None
        await redis.delete(f"mp_oauth:{state}")
        return json.loads(raw)

    async def get_authorize_url(self, establishment_id: UUID, user_id: UUID) -> str:
        """Build Mercado Pago OAuth authorization URL."""
        client_id, _, redirect_uri = await self._oauth_config()
        state = secrets.token_urlsafe(32)
        await self._store_oauth_state(state, establishment_id, user_id)
        params = (
            f"client_id={client_id}"
            f"&response_type=code"
            f"&platform_id=mp"
            f"&state={state}"
            f"&redirect_uri={redirect_uri}"
        )
        return f"{MP_AUTH_URL}?{params}"

    async def handle_callback(self, code: str, state: str) -> Establishment:
        """Exchange authorization code and persist seller credentials."""
        state_data = await self._pop_oauth_state(state)
        if not state_data:
            raise ValueError("Sessão OAuth expirada ou inválida. Tente conectar novamente.")

        establishment_id = UUID(state_data["establishment_id"])
        user_id = UUID(state_data["user_id"])

        result = await self.db.execute(
            select(Establishment).where(Establishment.id == establishment_id)
        )
        establishment = result.scalar_one_or_none()
        if not establishment:
            raise ValueError("Estabelecimento não encontrado")

        if establishment.owner_id != user_id:
            raise ValueError("Não autorizado para conectar esta conta")

        client_id, client_secret, redirect_uri = await self._oauth_config()

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                MP_TOKEN_URL,
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                },
                headers={"Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded"},
            )

        if response.status_code not in (200, 201):
            logger.error(
                "MercadoPago OAuth token exchange failed",
                status=response.status_code,
                body=response.text[:400],
            )
            raise ValueError("Falha ao conectar conta Mercado Pago. Tente novamente.")

        token_data = response.json()
        mp_user_id = str(token_data.get("user_id", ""))
        access_token = token_data.get("access_token", "")
        refresh_token = token_data.get("refresh_token")

        if not mp_user_id or not access_token:
            raise ValueError("Resposta inválida do Mercado Pago")

        establishment.mercadopago_user_id = mp_user_id
        establishment.mercadopago_access_token = access_token
        establishment.mercadopago_refresh_token = refresh_token
        establishment.mercadopago_connected_at = datetime.now(UTC)

        await self.db.commit()
        await self.db.refresh(establishment)

        logger.info(
            "MercadoPago OAuth connected",
            establishment_id=str(establishment_id),
            mp_user_id=mp_user_id,
        )
        return establishment

    async def disconnect(self, establishment: Establishment) -> None:
        """Remove Mercado Pago OAuth link from establishment."""
        establishment.mercadopago_user_id = None
        establishment.mercadopago_access_token = None
        establishment.mercadopago_refresh_token = None
        establishment.mercadopago_connected_at = None
        await self.db.commit()

    async def get_status(self, establishment: Establishment) -> dict[str, Any]:
        """Return connection status for UI."""
        connected = bool(
            establishment.mercadopago_user_id and establishment.mercadopago_access_token
        )
        return {
            "connected": connected,
            "mercadopago_user_id": establishment.mercadopago_user_id,
            "connected_at": establishment.mercadopago_connected_at,
            "split_enabled": connected,
        }

    async def ensure_valid_seller_token(self, establishment: Establishment) -> str | None:
        """Return seller access token. Returns None if seller is not connected."""
        if not establishment.mercadopago_access_token:
            return None
        return establishment.mercadopago_access_token

    async def build_marketplace_fields(
        self,
        establishment: Establishment,
        application_fee: float,
    ) -> dict[str, str]:
        """Build split-payment metadata with a valid seller token."""
        token = await self.ensure_valid_seller_token(establishment)
        fields: dict[str, str] = {}
        if application_fee > 0:
            fields["application_fee"] = str(round(application_fee, 2))
        if token:
            fields["seller_access_token"] = token
        if establishment.mercadopago_user_id:
            fields["collector_id"] = establishment.mercadopago_user_id
        return fields

    async def refresh_seller_token(self, establishment: Establishment) -> str | None:
        """Refresh seller OAuth token using refresh_token."""
        if not establishment.mercadopago_refresh_token:
            return establishment.mercadopago_access_token

        client_id, client_secret, _ = await self._oauth_config()

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                MP_TOKEN_URL,
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "grant_type": "refresh_token",
                    "refresh_token": establishment.mercadopago_refresh_token,
                },
                headers={"Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded"},
            )

        if response.status_code not in (200, 201):
            logger.warning(
                "MercadoPago token refresh failed",
                establishment_id=str(establishment.id),
                status=response.status_code,
            )
            return establishment.mercadopago_access_token

        data = response.json()
        establishment.mercadopago_access_token = data.get("access_token")
        if data.get("refresh_token"):
            establishment.mercadopago_refresh_token = data["refresh_token"]
        await self.db.commit()
        return establishment.mercadopago_access_token

    @staticmethod
    def marketplace_payment_fields(
        establishment: Establishment,
        application_fee: float,
    ) -> dict[str, str]:
        """Sync helper — prefer build_marketplace_fields when db session is available."""
        fields: dict[str, str] = {}
        if application_fee > 0:
            fields["application_fee"] = str(round(application_fee, 2))
        if establishment.mercadopago_access_token:
            fields["seller_access_token"] = establishment.mercadopago_access_token
        if establishment.mercadopago_user_id:
            fields["collector_id"] = establishment.mercadopago_user_id
        return fields
