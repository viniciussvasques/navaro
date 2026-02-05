"""Reviews integration tests."""

import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_review_flow(
    client: AsyncClient,
    auth_headers: dict,
    auth_headers_second_user: dict,
    establishment_id: str,
    service_id: str,
    staff_id: str,
):
    """Test full review flow."""
    
    # 1. Customer Creates Review
    # ----------------------------------------------------------------------------------
    review_data = {
        "establishment_id": establishment_id,
        "rating": 5,
        "comment": "Ótimo serviço!",
        "staff_id": staff_id
    }
    resp = await client.post(
        "/api/v1/reviews",
        headers=auth_headers_second_user,
        json=review_data
    )
    assert resp.status_code == 201
    review = resp.json()
    assert review["rating"] == 5
    assert review["comment"] == "Ótimo serviço!"
    review_id = review["id"]

    # 2. List Establishment Reviews (Public)
    # ----------------------------------------------------------------------------------
    resp = await client.get(f"/api/v1/reviews/establishments/{establishment_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert data["items"][0]["id"] == review_id
    assert data["items"][0]["comment"] == "Ótimo serviço!"

    # 3. Customer Updates Review
    # ----------------------------------------------------------------------------------
    update_data = {
        "rating": 4,
        "comment": "Serviço bom, mas demorou um pouco."
    }
    resp = await client.patch(
        f"/api/v1/reviews/{review_id}",
        headers=auth_headers_second_user,
        json=update_data
    )
    assert resp.status_code == 200
    updated = resp.json()
    assert updated["rating"] == 4
    assert updated["comment"] == "Serviço bom, mas demorou um pouco."

    # 4. Owner Responds
    # ----------------------------------------------------------------------------------
    # auth_headers is owner of establishment_id (from conftest fixtures)
    response_data = {
        "response": "Obrigado pelo feedback, vamos melhorar!"
    }
    resp = await client.patch(
        f"/api/v1/reviews/{review_id}/respond",
        headers=auth_headers,
        json=response_data
    )
    assert resp.status_code == 200
    responded = resp.json()
    assert responded["owner_response"] == "Obrigado pelo feedback, vamos melhorar!"
    
    # 5. Verify Response in Public List
    # ----------------------------------------------------------------------------------
    resp = await client.get(f"/api/v1/reviews/establishments/{establishment_id}")
    data = resp.json()
    assert data["items"][0]["owner_response"] == "Obrigado pelo feedback, vamos melhorar!"

@pytest.mark.asyncio
async def test_review_validation(
    client: AsyncClient,
    auth_headers: dict,
    establishment_id: str
):
    """Test review validation."""
    
    # Invalid Rating (0)
    resp = await client.post(
        "/api/v1/reviews",
        headers=auth_headers,
        json={
            "establishment_id": establishment_id,
            "rating": 0
        }
    )
    assert resp.status_code == 422
    
    # Invalid Rating (6)
    resp = await client.post(
        "/api/v1/reviews",
        headers=auth_headers,
        json={
            "establishment_id": establishment_id,
            "rating": 6
        }
    )
    assert resp.status_code == 422
