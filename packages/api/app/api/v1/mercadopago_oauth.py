"""Mercado Pago OAuth marketplace endpoints."""

from uuid import UUID

from fastapi import APIRouter, Query
from fastapi.responses import RedirectResponse

from app.api.deps import CurrentUser, DBSession
from app.core.exceptions import BusinessError, ForbiddenError, NotFoundError
from app.dependencies import verify_establishment_owner
from app.models.user import UserRole
from app.schemas.mercadopago import MercadoPagoConnectResponse, MercadoPagoOAuthUrlResponse
from app.services.mercadopago_oauth_service import MercadoPagoOAuthService
from app.services.settings_service import SettingsService

router = APIRouter(prefix="/mercadopago", tags=["Mercado Pago OAuth"])


@router.get("/oauth/callback")
async def oauth_callback(
    db: DBSession,
    code: str = Query(...),
    state: str = Query(...),
) -> RedirectResponse:
    """
    OAuth redirect from Mercado Pago (public).
    Redirects owner back to Pro Web settings.
    """
    service = MercadoPagoOAuthService(db)
    settings = SettingsService(db)
    pro_url = await settings.get("pro_web_url") or "https://pro.dunnaa.com.br"

    try:
        await service.handle_callback(code, state)
        return RedirectResponse(f"{pro_url}/settings?mp=connected")
    except ValueError as e:
        from urllib.parse import quote

        return RedirectResponse(f"{pro_url}/settings?mp=error&message={quote(str(e))}")


@router.get(
    "/establishments/{establishment_id}/oauth/url",
    response_model=MercadoPagoOAuthUrlResponse,
)
async def get_oauth_url(
    establishment_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> MercadoPagoOAuthUrlResponse:
    """Start OAuth — returns URL to redirect the establishment owner."""
    await verify_establishment_owner(db, establishment_id, current_user)
    service = MercadoPagoOAuthService(db)
    try:
        url = await service.get_authorize_url(establishment_id, current_user.id)
    except ValueError as e:
        raise BusinessError("MP_OAUTH_NOT_CONFIGURED", str(e)) from e
    return MercadoPagoOAuthUrlResponse(authorize_url=url)


@router.get(
    "/establishments/{establishment_id}/status",
    response_model=MercadoPagoConnectResponse,
)
async def get_connection_status(
    establishment_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> MercadoPagoConnectResponse:
    """Mercado Pago marketplace connection status."""
    establishment = await verify_establishment_owner(db, establishment_id, current_user)
    service = MercadoPagoOAuthService(db)
    status = await service.get_status(establishment)
    return MercadoPagoConnectResponse(**status)


@router.delete("/establishments/{establishment_id}/disconnect")
async def disconnect_mercadopago(
    establishment_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> dict[str, str]:
    """Disconnect Mercado Pago OAuth from establishment."""
    establishment = await verify_establishment_owner(db, establishment_id, current_user)
    if current_user.role not in (UserRole.owner, UserRole.admin):
        raise ForbiddenError()
    service = MercadoPagoOAuthService(db)
    await service.disconnect(establishment)
    return {"status": "disconnected"}
