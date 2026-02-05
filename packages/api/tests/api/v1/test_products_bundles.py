import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_product_crud(client: AsyncClient, establishment_id: str, auth_headers: dict):
    """Test product CRUD operations."""
    # Create product
    resp = await client.post(
        f"/api/v1/establishments/{establishment_id}/products",
        json={
            "name": "Pomada Modeladora",
            "description": "Efeito seco",
            "price": 45.0,
            "stock_quantity": 10,
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    prod_id = resp.json()["id"]

    # List products
    resp = await client.get(f"/api/v1/establishments/{establishment_id}/products")
    assert resp.status_code == 200
    assert any(p["id"] == prod_id for p in resp.json())

    # Update product
    resp = await client.patch(
        f"/api/v1/establishments/{establishment_id}/products/{prod_id}",
        json={"price": 50.0},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["price"] == 50.0


@pytest.mark.asyncio
async def test_bundle_creation(
    client: AsyncClient, establishment_id: str, auth_headers: dict, service_id: str
):
    """Test creating a service bundle."""
    # Create bundle with the fixture service
    resp = await client.post(
        f"/api/v1/establishments/{establishment_id}/bundles",
        json={
            "name": "Combo Super",
            "description": "Serviço por um preço melhor",
            "bundle_price": 40.0,
            "service_ids": [service_id],
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["bundle_price"] == 40.0
    assert len(data["services"]) == 1
    assert data["services"][0]["id"] == service_id


@pytest.mark.asyncio
async def test_appointment_with_products(
    client: AsyncClient, establishment_id: str, auth_headers: dict, service_id: str, staff_id: str
):
    """Test creating an appointment and adding products."""
    # 1. Create a product
    prod_resp = await client.post(
        f"/api/v1/establishments/{establishment_id}/products",
        json={"name": "Gel", "price": 20.0, "stock_quantity": 5},
        headers=auth_headers,
    )
    prod_id = prod_resp.json()["id"]

    # 2. Get service price for expected total
    serv_resp = await client.get(f"/api/v1/establishments/{establishment_id}/services")
    service = [s for s in serv_resp.json() if s["id"] == service_id][0]

    # 3. Create appointment with product
    appt_resp = await client.post(
        "/api/v1/appointments",
        json={
            "establishment_id": establishment_id,
            "service_id": service_id,
            "staff_id": staff_id,
            "scheduled_at": "2026-12-25T10:00:00Z",
            "payment_type": "single",
            "products": [{"product_id": prod_id, "quantity": 2}],
        },
        headers=auth_headers,
    )
    assert appt_resp.status_code == 201
    data = appt_resp.json()

    expected_service_price = float(service["price"])
    expected_total = expected_service_price + (20.0 * 2)
    assert data["total_price"] == expected_total
    assert len(data["products"]) == 1
    assert data["products"][0]["name"] == "Gel"
