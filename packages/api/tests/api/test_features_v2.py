import pytest
from httpx import AsyncClient
from uuid import UUID


@pytest.mark.asyncio
async def test_product_calc_logic(client: AsyncClient, auth_headers: dict, establishment_id: UUID):
    # 1. Create product with cost and markup
    payload = {
        "name": "Shampoo Premium",
        "description": "Calculated price",
        "cost_price": 20.0,
        "markup_percentage": 50.0,
        "stock_quantity": 10,
    }
    response = await client.post(
        f"/api/v1/establishments/{establishment_id}/products", json=payload, headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    # 20 * (1 + 0.5) = 30
    assert data["price"] == 30.0
    assert data["profit_margin"] == 33.33  # (30-20)/30 = 0.3333


@pytest.mark.asyncio
async def test_staff_bio(client: AsyncClient, auth_headers: dict, establishment_id: UUID):
    # 1. Create staff with bio
    payload = {
        "name": "João Barbeiro",
        "role": "Senior",
        "bio": "Especialista em degrade e barba terapia.",
    }
    response = await client.post(
        f"/api/v1/establishments/{establishment_id}/staff", json=payload, headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["bio"] == payload["bio"]


@pytest.mark.asyncio
async def test_service_at_home(client: AsyncClient, auth_headers: dict, establishment_id: UUID):
    # 1. Create service with is_at_home
    payload = {
        "name": "Corte em domicílio",
        "price": 100.0,
        "duration_minutes": 60,
        "is_at_home": True,
    }
    response = await client.post(
        f"/api/v1/establishments/{establishment_id}/services", json=payload, headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["is_at_home"] is True


@pytest.mark.asyncio
async def test_establishment_profile_aggregated(client: AsyncClient, establishment_id: UUID):
    # Test public profile
    response = await client.get(f"/api/v1/establishments/{establishment_id}/profile")
    assert response.status_code == 200
    data = response.json()

    assert "establishment" in data
    assert "services" in data
    assert "staff" in data
    assert "gallery" in data
    assert "reviews" in data
    assert "rating" in data
    assert "review_count" in data

    # Check if establishment details are there
    assert data["establishment"]["id"] == str(establishment_id)


@pytest.mark.asyncio
async def test_new_categories(client: AsyncClient, auth_headers: dict):
    # Create establishment with spa category
    payload = {
        "name": "Spa Relax",
        "category": "spa",
        "address": "Rua do Sossego, 123",
        "city": "São Paulo",
        "state": "SP",
        "phone": "11999999999",
    }
    response = await client.post("/api/v1/establishments", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["category"] == "spa"
