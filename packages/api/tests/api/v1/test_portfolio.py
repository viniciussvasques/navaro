"""Portfolio integration tests."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_portfolio_flow(
    client: AsyncClient,
    auth_headers: dict,
    establishment_id: str,
    staff_id: str,
    auth_headers_second_user: dict,
):
    """Test full portfolio flow (Establishment and Staff)."""
    
    # 1. Add Image to Establishment
    # ----------------------------------------------------------------------------------
    image_data = {
        "establishment_id": establishment_id,
        "image_url": "https://example.com/photo1.jpg",
        "description": "Trabalho de hoje"
    }
    resp = await client.post(
        "/api/v1/portfolio",
        headers=auth_headers,
        json=image_data
    )
    assert resp.status_code == 201
    image_id = resp.json()["id"]

    # 2. Add Image linked to Staff
    # ----------------------------------------------------------------------------------
    staff_image_data = {
        "establishment_id": establishment_id,
        "staff_id": staff_id,
        "image_url": "https://example.com/photo2.jpg",
        "description": "Corte degradê"
    }
    resp = await client.post(
        "/api/v1/portfolio",
        headers=auth_headers,
        json=staff_image_data
    )
    assert resp.status_code == 201
    staff_image_id = resp.json()["id"]

    # 3. List Establishment Portfolio
    # ----------------------------------------------------------------------------------
    resp = await client.get(f"/api/v1/portfolio/establishments/{establishment_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2

    # 4. List Staff Portfolio
    # ----------------------------------------------------------------------------------
    resp = await client.get(f"/api/v1/portfolio/staff/{staff_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["staff_id"] == staff_id

    # 5. Unauthorized Delete (Second User)
    # ----------------------------------------------------------------------------------
    resp = await client.delete(
        f"/api/v1/portfolio/{image_id}",
        headers=auth_headers_second_user
    )
    assert resp.status_code == 403

    # 6. Delete Image
    # ----------------------------------------------------------------------------------
    resp = await client.delete(
        f"/api/v1/portfolio/{image_id}",
        headers=auth_headers
    )
    assert resp.status_code == 204

    # 7. Verify List after Delete
    # ----------------------------------------------------------------------------------
    resp = await client.get(f"/api/v1/portfolio/establishments/{establishment_id}")
    data = resp.json()
    assert data["total"] == 1
