"""Tests for establishment media upload endpoints (logo/cover)."""

import pytest
from httpx import AsyncClient
from uuid import UUID


class _FakeStorage:
    async def upload_establishment_logo(
        self, *, establishment_id: UUID, content: bytes, content_type: str
    ) -> str:  # type: ignore[override]
        assert content  # non-empty
        assert content_type.startswith("image/")
        return f"https://cdn.test/establishments/{establishment_id}/logo.jpg"

    async def upload_establishment_cover(
        self, *, establishment_id: UUID, content: bytes, content_type: str
    ) -> str:  # type: ignore[override]
        assert content
        assert content_type.startswith("image/")
        return f"https://cdn.test/establishments/{establishment_id}/cover.jpg"


@pytest.mark.asyncio
async def test_upload_logo_success(
    client: AsyncClient, auth_headers: dict, establishment_id: str, monkeypatch
):
    from app.api.v1 import establishments as est_module

    async def fake_from_db(db):
        return _FakeStorage()

    monkeypatch.setattr(est_module.StorageService, "from_db", fake_from_db)

    files = {"file": ("logo.png", b"fake-bytes", "image/png")}
    resp = await client.post(
        f"/api/v1/establishments/{establishment_id}/logo",
        headers=auth_headers,
        files=files,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["logo_url"].startswith("https://cdn.test/establishments/")


@pytest.mark.asyncio
async def test_upload_cover_success(
    client: AsyncClient, auth_headers: dict, establishment_id: str, monkeypatch
):
    from app.api.v1 import establishments as est_module

    async def fake_from_db(db):
        return _FakeStorage()

    monkeypatch.setattr(est_module.StorageService, "from_db", fake_from_db)

    files = {"file": ("cover.jpg", b"fake-cover", "image/jpeg")}
    resp = await client.post(
        f"/api/v1/establishments/{establishment_id}/cover",
        headers=auth_headers,
        files=files,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["cover_url"].startswith("https://cdn.test/establishments/")


@pytest.mark.asyncio
async def test_upload_logo_empty_file_returns_400(
    client: AsyncClient, auth_headers: dict, establishment_id: str, monkeypatch
):
    from app.api.v1 import establishments as est_module

    async def fake_from_db(db):
        return _FakeStorage()

    monkeypatch.setattr(est_module.StorageService, "from_db", fake_from_db)

    # Envia arquivo vazio
    files = {"file": ("logo.png", b"", "image/png")}
    resp = await client.post(
        f"/api/v1/establishments/{establishment_id}/logo",
        headers=auth_headers,
        files=files,
    )
    assert resp.status_code == 400
    body = resp.json()
    assert body["error"]["message"] == "Arquivo vazio."
