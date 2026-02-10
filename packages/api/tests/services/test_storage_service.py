"""Tests for StorageService helpers (no real S3 access)."""

from uuid import uuid4

import pytest

from app.services.storage_service import StorageConfig, StorageService


def _make_service() -> StorageService:
    config = StorageConfig(
        enabled=True,
        endpoint="https://s3.example.com",
        access_key="key",
        secret_key="secret",
        bucket="bucket-test",
        public_url="https://cdn.example.com",
    )
    return StorageService(config)


def test_build_key_and_url_logo_and_cover() -> None:
    svc = _make_service()
    est_id = uuid4()

    logo_key = svc._build_key(kind="logo", establishment_id=est_id, extension="png")
    cover_key = svc._build_key(kind="cover", establishment_id=est_id, extension="jpg")

    assert f"media/establishments/{est_id}/logo.png" == logo_key
    assert f"media/establishments/{est_id}/cover.jpg" == cover_key

    logo_url = svc._build_url(logo_key)
    assert logo_url == f"https://cdn.example.com/{logo_key}"


@pytest.mark.asyncio
async def test_upload_public_uses_client_and_returns_url(monkeypatch) -> None:
    """upload_public deve chamar put_object e retornar a URL esperada."""
    svc = _make_service()
    called = {}

    def fake_put_object(**kwargs):
        called.update(kwargs)

    monkeypatch.setattr(svc._client, "put_object", fake_put_object)

    key = "media/establishments/123/logo.jpg"
    url = await svc.upload_public(
        content=b"data",
        content_type="image/jpeg",
        key=key,
        extra_metadata={"x-test": "1"},
    )

    assert url == f"https://cdn.example.com/{key}"
    assert called["Bucket"] == svc.config.bucket
    assert called["Key"] == key
    assert called["Body"] == b"data"
    assert called["ContentType"] == "image/jpeg"
    assert called["ACL"] == "public-read"
    assert called["Metadata"] == {"x-test": "1"}

