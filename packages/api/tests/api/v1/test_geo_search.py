"""Integration tests for Advanced Geo Search."""

import pytest
from httpx import AsyncClient
from uuid import uuid4

@pytest.mark.asyncio
async def test_geo_search_radius(client: AsyncClient, auth_headers: dict):
    """Test searching establishments within a radius."""
    
    # 1. Create a few establishments at known locations
    # (São Paulo Center)
    sp_center = {"lat": -23.5505, "lng": -46.6333}
    
    # Near (1km)
    resp = await client.post("/api/v1/establishments", json={
        "name": "Barbearia Perto",
        "category": "barber_salon",
        "address": "Rua Perto, 1",
        "city": "São Paulo",
        "state": "SP",
        "phone": "11999999999"
    }, headers=auth_headers)
    est_near_id = resp.json()["id"]
    
    # Update manually to set lat/lng (since create might not support them yet)
    resp = await client.patch(f"/api/v1/establishments/{est_near_id}", json={
        "latitude": -23.555, # ~0.5km south
        "longitude": -46.633,
        "status": "active"
    }, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "active"
    assert resp.json()["latitude"] is not None

    # Far (10km)
    resp = await client.post("/api/v1/establishments", json={
        "name": "Barbearia Longe",
        "category": "barbershop",
        "address": "Rua Longe, 100",
        "city": "São Paulo",
        "state": "SP",
        "phone": "11888888888"
    }, headers=auth_headers)
    est_far_id = resp.json()["id"]
    
    resp = await client.patch(f"/api/v1/establishments/{est_far_id}", json={
        "latitude": -23.650, # ~11km south
        "longitude": -46.633,
        "status": "active"
    }, headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "active"

    # 2. Search with 2km radius
    # --------------------------------------------------------------------------
    resp = await client.get(f"/api/v1/establishments?lat={sp_center['lat']}&lng={sp_center['lng']}&radius=2")
    assert resp.status_code == 200
    data = resp.json()
    items = data["items"]
    ids = [item["id"] for item in items]
    
    print(f"\nDEBUG: --- 2KM SEARCH RESULTS ---")
    print(f"DEBUG: Total: {data['total']}, Items in list: {len(items)}")
    print(f"DEBUG: IDs found: {ids}")
    print(f"DEBUG: Target Near ID: {est_near_id}")
    print(f"DEBUG: Target Far ID: {est_far_id}")
    
    for item in items:
        print(f"DEBUG: - {item['name']} ({item['id']}) Distance: {item.get('distance')} km Status: {item['status']}")
    
    assert str(est_near_id) in ids, f"Near ID {est_near_id} not found in {ids}"
    assert str(est_far_id) not in ids, f"Far ID {est_far_id} unexpectedly found in {ids}"
    
    # Distance should be present
    est_near = next(item for item in items if item["id"] == str(est_near_id))
    assert est_near["distance"] is not None
    assert est_near["distance"] < 1.0

    # 3. Search with 15km radius (Should find both)
    # --------------------------------------------------------------------------
    resp = await client.get(f"/api/v1/establishments?lat={sp_center['lat']}&lng={sp_center['lng']}&radius=15")
    assert resp.status_code == 200
    data = resp.json()
    items = data["items"]
    ids = [item["id"] for item in items]
    
    print(f"\nDEBUG: --- 15KM SEARCH RESULTS ---")
    print(f"DEBUG: Total: {data['total']}, Items in list: {len(items)}")
    for item in items:
        print(f"DEBUG: - {item['name']} ({item['id']}) Distance: {item.get('distance')} km")

    assert str(est_near_id) in ids
    assert str(est_far_id) in ids
    
    # Sorting: Near should be first
    # Find indices to be sure
    idx_near = ids.index(str(est_near_id))
    idx_far = ids.index(str(est_far_id))
    assert idx_near < idx_far, f"Near ID should be before Far ID. Near index: {idx_near}, Far index: {idx_far}"
