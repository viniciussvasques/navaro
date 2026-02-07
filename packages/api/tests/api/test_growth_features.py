import pytest
from httpx import AsyncClient
from uuid import uuid4


@pytest.mark.asyncio
async def test_establishment_ranking_logic(client: AsyncClient, auth_headers: dict):
    """
    Test that establishments are ranked correctly:
    1. Sponsored first
    2. Higher subscription tier second
    3. Distance third
    """
    # 1. Create 3 establishments in the same city (Sao Paulo)
    # A: Free, not sponsored, close
    # B: Bronze, not sponsored, far
    # C: Free, sponsored, far

    # Coordinates for Sao Paulo (ish)
    base_lat, base_lng = -23.5505, -46.6333

    # Establishments
    payloads = [
        {
            "name": "Est A (Free, Close)",
            "slug": f"est-a-{uuid4().hex[:6]}",
            "category": "barbershop",
            "address": "Rua A, 100",
            "city": "Sao Paulo",
            "state": "SP",
            "phone": "11999999999",
            "latitude": base_lat + 0.001,
            "longitude": base_lng + 0.001,
        },
        {
            "name": "Est B (Bronze, Far)",
            "slug": f"est-b-{uuid4().hex[:6]}",
            "category": "barbershop",
            "address": "Rua B, 200",
            "city": "Sao Paulo",
            "state": "SP",
            "phone": "11999999998",
            "latitude": base_lat + 0.01,
            "longitude": base_lng + 0.01,
        },
        {
            "name": "Est C (Sponsored, Far)",
            "slug": f"est-c-{uuid4().hex[:6]}",
            "category": "barbershop",
            "address": "Rua C, 300",
            "city": "Sao Paulo",
            "state": "SP",
            "phone": "11999999997",
            "latitude": base_lat + 0.02,
            "longitude": base_lng + 0.02,
        },
    ]

    est_ids = []
    headers = auth_headers
    for p in payloads:
        resp = await client.post("/api/v1/establishments", json=p, headers=headers)
        assert resp.status_code == 201
        est_id = resp.json()["id"]
        est_ids.append(est_id)
        # Activate
        await client.patch(
            f"/api/v1/establishments/{est_id}", json={"status": "active"}, headers=headers
        )

    # Update Tiers and Sponsored status (Directly via Admin or Internal if endpoint exists)
    # Since we don't have a specific endpoint for everything yet, let's assume we can PATCH them

    # Est B -> Bronze
    await client.patch(
        f"/api/v1/establishments/{est_ids[1]}",
        json={"subscription_tier": "bronze"},
        headers=headers,
    )

    # Est C -> Sponsored
    await client.patch(
        f"/api/v1/establishments/{est_ids[2]}", json={"is_sponsored": True}, headers=headers
    )

    # Search
    # We expect: C (Sponsored), B (Bronze), A (Free, but closer)
    resp = await client.get(
        f"/api/v1/establishments?city=Sao Paulo&lat={base_lat}&lng={base_lng}", headers=headers
    )
    assert resp.status_code == 200
    items = resp.json()["items"]

    # Filter only our newly created ones for testing
    our_items = [i for i in items if i["id"] in est_ids]

    assert len(our_items) == 3
    assert our_items[0]["name"] == "Est C (Sponsored, Far)"
    assert our_items[1]["name"] == "Est B (Bronze, Far)"
    assert our_items[2]["name"] == "Est A (Free, Close)"


@pytest.mark.asyncio
async def test_staff_contract_and_base_salary(client: AsyncClient, auth_headers: dict):
    """Test staff creation with contract type and base salary."""
    # 1. Create Establishment
    headers = auth_headers
    est_payload = {
        "name": "Contract Test Est",
        "slug": f"contract-test-{uuid4().hex[:6]}",
        "category": "barbershop",
        "address": "Rua X, 1",
        "city": "Test City",
        "state": "TS",
        "phone": "11888888888",
    }
    resp = await client.post("/api/v1/establishments", json=est_payload, headers=headers)
    est_id = resp.json()["id"]

    # 2. Create Staff with Chair Rental
    staff_payload = {
        "name": "Barbeiro Aluguel",
        "role": "barbeiro",
        "contract_type": "chair_rental",
        "base_salary": 500.0,
        "commission_rate": 0.0,
    }
    resp = await client.post(
        f"/api/v1/establishments/{est_id}/staff", json=staff_payload, headers=headers
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["contract_type"] == "chair_rental"
    assert data["base_salary"] == 500.0
