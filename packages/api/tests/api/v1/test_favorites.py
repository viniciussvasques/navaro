"""Favorites integration tests."""

import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_favorites_flow(
    client: AsyncClient,
    auth_headers: dict,
    establishment_id: str,
    staff_id: str,
):
    """Test full favorites flow (Establishment and Staff)."""
    
    # 1. Favorite Establishment
    # ----------------------------------------------------------------------------------
    resp = await client.post(
        "/api/v1/favorites/establishments",
        headers=auth_headers,
        json={"establishment_id": establishment_id}
    )
    assert resp.status_code == 200
    assert resp.json()["added"] is True

    # 2. Favorite Staff
    # ----------------------------------------------------------------------------------
    resp = await client.post(
        "/api/v1/favorites/staff",
        headers=auth_headers,
        json={
            "staff_id": staff_id,
            "establishment_id": establishment_id
        }
    )
    assert resp.status_code == 200
    assert resp.json()["added"] is True

    # 3. List Favorites
    # ----------------------------------------------------------------------------------
    resp = await client.get("/api/v1/favorites", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["establishments"]) == 1
    assert len(data["staff"]) == 1
    assert data["establishments"][0]["establishment_id"] == establishment_id
    assert data["staff"][0]["staff_id"] == staff_id

    # 4. Unfavorite Establishment (Toggle)
    # ----------------------------------------------------------------------------------
    resp = await client.post(
        "/api/v1/favorites/establishments",
        headers=auth_headers,
        json={"establishment_id": establishment_id}
    )
    assert resp.status_code == 200
    assert resp.json()["added"] is False

    # 5. Verify List After Unfavorite
    # ----------------------------------------------------------------------------------
    resp = await client.get("/api/v1/favorites", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["establishments"]) == 0
    assert len(data["staff"]) == 1
