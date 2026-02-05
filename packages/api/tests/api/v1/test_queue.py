"""Queue integration tests."""

import pytest
from httpx import AsyncClient
from uuid import uuid4

@pytest.mark.asyncio
async def test_queue_flow(
    client: AsyncClient,
    auth_headers: dict,
    auth_headers_second_user: dict,
    establishment_id: str,
    service_id: str,
    staff_id: str,
):
    """Test full queue flow."""
    
    # 1. Join Queue (User 1)
    # ----------------------------------------------------------------------------------
    resp = await client.post(
        "/api/v1/queue",
        headers=auth_headers,
        json={
            "establishment_id": establishment_id,
            "service_id": service_id,
            "preferred_staff_id": staff_id
        }
    )
    assert resp.status_code == 201
    entry1 = resp.json()
    assert entry1["position"] == 1
    assert entry1["status"] == "waiting"
    entry1_id = entry1["id"]

    # 2. Join Queue (User 2)
    # ----------------------------------------------------------------------------------
    resp = await client.post(
        "/api/v1/queue",
        headers=auth_headers_second_user,
        json={
            "establishment_id": establishment_id,
            "service_id": service_id
        }
    )
    assert resp.status_code == 201
    entry2 = resp.json()
    assert entry2["position"] == 2
    assert entry2["status"] == "waiting"
    entry2_id = entry2["id"]

    # 3. List Queue (Public)
    # ----------------------------------------------------------------------------------
    resp = await client.get(f"/api/v1/queue/establishments/{establishment_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_waiting"] == 2
    assert len(data["items"]) >= 2
    assert data["items"][0]["id"] == entry1_id
    assert data["items"][1]["id"] == entry2_id

    # 4. User 1 Leaves Queue (Cancel)
    # ----------------------------------------------------------------------------------
    resp = await client.delete(
        f"/api/v1/queue/{entry1_id}",
        headers=auth_headers
    )
    assert resp.status_code == 204

    # 5. Verify Reordering (User 2 should be Pos 1 now)
    # ----------------------------------------------------------------------------------
    resp = await client.get(f"/api/v1/queue/establishments/{establishment_id}")
    data = resp.json()
    active_items = [i for i in data["items"] if i["status"] == "waiting"]
    assert active_items[0]["id"] == entry2_id
    assert active_items[0]["position"] == 1

    # 6. Staff Calls User 2
    # ----------------------------------------------------------------------------------
    # Currently assuming auth_headers (User 1) is Owner, so they can update status
    resp = await client.patch(
        f"/api/v1/queue/{entry2_id}/status",
        headers=auth_headers,
        json={"status": "called"}
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "called"

    # 7. Staff Serving User 2
    # ----------------------------------------------------------------------------------
    resp = await client.patch(
        f"/api/v1/queue/{entry2_id}/status",
        headers=auth_headers,
        json={"status": "serving"}
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "serving"

    # 8. Complete Service
    # ----------------------------------------------------------------------------------
    resp = await client.patch(
        f"/api/v1/queue/{entry2_id}/status",
        headers=auth_headers,
        json={"status": "completed"}
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "completed"

    # 9. Verify List Empty (Active)
    # ----------------------------------------------------------------------------------
    resp = await client.get(f"/api/v1/queue/establishments/{establishment_id}?status_filter=waiting")
    data = resp.json()
    assert len(data["items"]) == 0
