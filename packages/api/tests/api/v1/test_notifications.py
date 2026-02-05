"""Notifications integration tests."""

import pytest
from httpx import AsyncClient
from app.models.queue import QueueStatus


@pytest.mark.asyncio
async def test_notifications_queue_flow(
    client: AsyncClient,
    auth_headers: dict, # This will be the owner in our setup if we use establishment_id
    auth_headers_second_user: dict, # This will be the customer
    establishment_id: str,
):
    """Test notification trigger when called in queue."""
    
    # 1. Join Queue (as Customer)
    # ----------------------------------------------------------------------------------
    resp = await client.post(
        "/api/v1/queue",
        headers=auth_headers_second_user,
        json={"establishment_id": establishment_id}
    )
    assert resp.status_code == 201
    entry_id = resp.json()["id"]

    # 2. Call from Queue (as Owner)
    # ----------------------------------------------------------------------------------
    resp = await client.patch(
        f"/api/v1/queue/{entry_id}/status",
        headers=auth_headers, # auth_headers is owner
        json={"status": QueueStatus.called}
    )
    assert resp.status_code == 200

    # 3. Check Notifications (as Customer)
    # ----------------------------------------------------------------------------------
    resp = await client.get("/api/v1/notifications", headers=auth_headers_second_user)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert data["unread_count"] >= 1
    
    notification = data["items"][0]
    assert notification["type"] == "queue"
    assert "chamado" in notification["message"].lower()
    notif_id = notification["id"]

    # 4. Mark as Read
    # ----------------------------------------------------------------------------------
    resp = await client.patch(f"/api/v1/notifications/{notif_id}/read", headers=auth_headers_second_user)
    assert resp.status_code == 200
    assert resp.json()["is_read"] is True


@pytest.mark.asyncio
async def test_notifications_checkin(
    client: AsyncClient,
    auth_headers: dict, # Owner
    auth_headers_second_user: dict, # Customer
    establishment_id: str,
    service_id: str,
    staff_id: str,
):
    """Test notification trigger when user checks in."""
    
    # 1. Create Appointment first (required by CheckinService)
    # ----------------------------------------------------------------------------------
    from datetime import datetime, timedelta
    scheduled_at = (datetime.now() + timedelta(days=1)).isoformat()
    resp = await client.post(
        "/api/v1/appointments",
        headers=auth_headers_second_user,
        json={
            "establishment_id": establishment_id,
            "service_id": service_id,
            "staff_id": staff_id,
            "scheduled_at": scheduled_at,
            "payment_type": "single"
        }
    )
    assert resp.status_code == 201

    # 2. Generate QR token as owner
    # ----------------------------------------------------------------------------------
    resp = await client.get(f"/api/v1/checkins/establishments/{establishment_id}/qr", headers=auth_headers)
    assert resp.status_code == 200
    qr_token = resp.json()["qr_token"]

    # 3. Perform check-in as user
    # ----------------------------------------------------------------------------------
    resp = await client.post("/api/v1/checkins", headers=auth_headers_second_user, json={"qr_token": qr_token})
    assert resp.status_code == 200

    # 4. Check owner inbox
    # ----------------------------------------------------------------------------------
    resp = await client.get("/api/v1/notifications", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    
    found = False
    for item in data["items"]:
        if item["type"] == "checkin":
            found = True
            break
    assert found is True
