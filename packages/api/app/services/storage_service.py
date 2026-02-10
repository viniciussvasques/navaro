"""Storage service for media uploads (S3/R2 compatible)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

import boto3
from botocore.client import Config as BotoConfig
from fastapi import HTTPException, status
from fastapi.concurrency import run_in_threadpool

from app.core.config import settings as app_settings
from app.core.logging import get_logger
from app.models.system_settings import SettingsKeys
from app.services.settings_service import SettingsService

if TYPE_CHECKING:
    from uuid import UUID

    from sqlalchemy.ext.asyncio import AsyncSession

logger = get_logger(__name__)


@dataclass
class StorageConfig:
    """Resolved storage configuration from DB + environment."""

    enabled: bool
    endpoint: str
    access_key: str
    secret_key: str
    bucket: str
    public_url: str


class StorageService:
    """S3/R2 compatible storage helper.

    - Lê configurações dinâmicas do banco (system_settings) via SettingsService.
    - Faz upload de arquivos e devolve a URL pública.
    """

    def __init__(self, config: StorageConfig) -> None:
        self.config = config
        self._client = boto3.client(
            "s3",
            endpoint_url=config.endpoint or None,
            aws_access_key_id=config.access_key or None,
            aws_secret_access_key=config.secret_key or None,
            config=BotoConfig(s3={"addressing_style": "virtual"}),
        )

    # ─── Factory ──────────────────────────────────────────────────────────────

    @classmethod
    async def from_db(cls, db: AsyncSession) -> "StorageService":
        """Build StorageService reading settings from DB (with env fallback)."""

        settings_service = SettingsService(db)

        enabled = await settings_service.get_bool(SettingsKeys.STORAGE_ENABLED, default=False)
        endpoint = await settings_service.get(SettingsKeys.S3_ENDPOINT, app_settings.S3_ENDPOINT)
        access_key = await settings_service.get(
            SettingsKeys.S3_ACCESS_KEY, app_settings.S3_ACCESS_KEY
        )
        secret_key = await settings_service.get(
            SettingsKeys.S3_SECRET_KEY, app_settings.S3_SECRET_KEY
        )
        bucket = await settings_service.get(SettingsKeys.S3_BUCKET, app_settings.S3_BUCKET)
        public_url = await settings_service.get(
            SettingsKeys.S3_PUBLIC_URL, app_settings.S3_PUBLIC_URL
        )

        # Se não estiver habilitado ou faltar configuração crítica, retorna 503
        if not enabled:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Storage não está habilitado (storage_enabled=false).",
            )

        if not all([endpoint, access_key, secret_key, bucket, public_url]):
            logger.error(
                "Storage mal configurado",
                endpoint=bool(endpoint),
                access_key=bool(access_key),
                bucket=bool(bucket),
                public_url=bool(public_url),
            )
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Storage S3/R2 mal configurado. Verifique endpoint, keys, bucket e URL pública.",
            )

        config = StorageConfig(
            enabled=enabled,
            endpoint=endpoint,
            access_key=access_key,
            secret_key=secret_key,
            bucket=bucket,
            public_url=public_url.rstrip("/"),
        )
        return cls(config)

    # ─── Helpers de chave e URL ───────────────────────────────────────────────

    def _build_key(
        self,
        *,
        kind: str,
        establishment_id: UUID,
        entity_id: UUID | None = None,
        extension: str = "jpg",
    ) -> str:
        """Build a deterministic object key."""

        base = f"media/establishments/{establishment_id}"
        if kind == "logo":
            return f"{base}/logo.{extension}"
        if kind == "cover":
            return f"{base}/cover.{extension}"
        if kind == "service" and entity_id:
            return f"{base}/services/{entity_id}.{extension}"
        if kind == "product" and entity_id:
            return f"{base}/products/{entity_id}.{extension}"
        if kind == "portfolio" and entity_id:
            return f"{base}/portfolio/{entity_id}.{extension}"
        # Fallback genérico
        return f"{base}/{kind}/{entity_id or 'file'}.{extension}"

    def _build_url(self, key: str) -> str:
        return f"{self.config.public_url}/{key}"

    # ─── Upload público ───────────────────────────────────────────────────────

    async def upload_public(
        self,
        *,
        content: bytes,
        content_type: str,
        key: str,
        extra_metadata: dict[str, Any] | None = None,
    ) -> str:
        """Upload object and return its public URL."""

        def _put_object() -> None:
            kwargs: dict[str, Any] = {
                "Bucket": self.config.bucket,
                "Key": key,
                "Body": content,
                "ContentType": content_type,
                "ACL": "public-read",
            }
            if extra_metadata:
                kwargs["Metadata"] = extra_metadata
            self._client.put_object(**kwargs)

        try:
            await run_in_threadpool(_put_object)
        except Exception as exc:  # pragma: no cover - log + HTTPException
            logger.error("Erro ao fazer upload para storage", error=str(exc), key=key)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Falha ao enviar arquivo para o storage.",
            ) from exc

        return self._build_url(key)

    # ─── Atalhos específicos ──────────────────────────────────────────────────

    async def upload_establishment_logo(
        self,
        *,
        establishment_id: UUID,
        content: bytes,
        content_type: str,
    ) -> str:
        key = self._build_key(kind="logo", establishment_id=establishment_id, extension="jpg")
        return await self.upload_public(content=content, content_type=content_type, key=key)

    async def upload_establishment_cover(
        self,
        *,
        establishment_id: UUID,
        content: bytes,
        content_type: str,
    ) -> str:
        key = self._build_key(kind="cover", establishment_id=establishment_id, extension="jpg")
        return await self.upload_public(content=content, content_type=content_type, key=key)

