import pytest
from httpx import AsyncClient
from uuid import uuid4
from datetime import datetime, timedelta, UTC

@pytest.mark.asyncio
async def test_staff_goals_workflow(client: AsyncClient, auth_headers: dict):
    """
    Test the complete staff goals workflow:
    1. Create establishment and staff
    2. Create a revenue goal
    3. Perform a service (complete appointment)
    4. Verify goal progress
    """
    headers = auth_headers
    
    # 1. Create Establishment
    est_payload = {
        "name": "Goals Test Est",
        "slug": f"goals-test-{uuid4().hex[:6]}",
        "category": "barbershop",
        "address": "Rua Goals, 100",
        "city": "Sao Paulo",
        "state": "SP",
        "phone": "11977777777",
        "business_hours": {
            "mon": {"open": "00:00", "close": "23:59"},
            "tue": {"open": "00:00", "close": "23:59"},
            "wed": {"open": "00:00", "close": "23:59"},
            "thu": {"open": "00:00", "close": "23:59"},
            "fri": {"open": "00:00", "close": "23:59"},
            "sat": {"open": "00:00", "close": "23:59"},
            "sun": {"open": "00:00", "close": "23:59"},
        }
    }
    resp = await client.post("/api/v1/establishments", json=est_payload, headers=headers)
    assert resp.status_code == 201
    est_id = resp.json()["id"]
    
    # 2. Create Staff
    staff_payload = {
        "name": "Professional Goals",
        "role": "barbeiro",
        "work_schedule": {
            "mon": {"open": "00:00", "close": "23:59"},
            "tue": {"open": "00:00", "close": "23:59"},
            "wed": {"open": "00:00", "close": "23:59"},
            "thu": {"open": "00:00", "close": "23:59"},
            "fri": {"open": "00:00", "close": "23:59"},
            "sat": {"open": "00:00", "close": "23:59"},
            "sun": {"open": "00:00", "close": "23:59"},
        }
    }
    resp = await client.post(f"/api/v1/establishments/{est_id}/staff", json=staff_payload, headers=headers)
    assert resp.status_code == 201
    staff_id = resp.json()["id"]

    # 3. Create Service
    service_payload = {
        "name": "Corte de Cabelo",
        "description": "Corte clássico",
        "price": 100.0,
        "duration_minutes": 30,
        "category": "Haircut",
    }
    resp = await client.post(f"/api/v1/establishments/{est_id}/services", json=service_payload, headers=headers)
    assert resp.status_code == 201
    service_id = resp.json()["id"]
    
    # Link service to staff (assuming endpoint exists or it's automatic in some setups)
    # Looking at Establishment router, it might be separate. 
    # But usually creating in establishment might not link to staff automatically if many staff.
    # Let's check staff services.
    await client.post(f"/api/v1/services/{service_id}/staff", json={"staff_ids": [staff_id]}, headers=headers)

    # 4. Create a Revenue Goal ($500 for this month)
    start_date = datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    end_date = (start_date + timedelta(days=32)).replace(day=1) - timedelta(seconds=1)
    
    goal_payload = {
        "staff_id": staff_id,
        "establishment_id": est_id,
        "goal_type": "revenue",
        "target_value": 500.0,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
    }
    resp = await client.post("/api/v1/staff-goals", json=goal_payload, headers=headers)
    assert resp.status_code == 201
    goal_id = resp.json()["id"]
    assert resp.json()["current_value"] == 0.0
    
    # 5. Create and Complete an Appointment ($100)
    appt_payload = {
        "establishment_id": est_id,
        "staff_id": staff_id,
        "service_id": service_id,
        "scheduled_at": (datetime.now(UTC) + timedelta(hours=1)).isoformat(),
        "payment_type": "single",
        "payment_method": "cash",
    }
    resp = await client.post("/api/v1/appointments", json=appt_payload, headers=headers)
    assert resp.status_code == 201
    appt_id = resp.json()["id"]
    
    # Mark as completed
    resp = await client.patch(f"/api/v1/appointments/{appt_id}", json={"status": "completed"}, headers=headers)
    assert resp.status_code == 200
    
    # 6. Verify Goal Progress (Should be $100 / 20%)
    resp = await client.get(f"/api/v1/staff-goals/staff/{staff_id}", headers=headers)
    assert resp.status_code == 200
    goals = resp.json()
    assert len(goals) > 0
    our_goal = [g for g in goals if g["id"] == goal_id][0]
    assert our_goal["current_value"] == 100.0
    assert our_goal["progress_percentage"] == 20.0
    assert our_goal["is_completed"] is False
    
    # 7. Complete more and finish goal
    # We need 4 more to hit 500
    for i in range(4):
        appt_payload["scheduled_at"] = (datetime.now(UTC) + timedelta(hours=2+i)).isoformat()
        resp = await client.post("/api/v1/appointments", json=appt_payload, headers=headers)
        assert resp.status_code == 201, f"Error creating appt {i}: {resp.json()}"
        new_appt_id = resp.json()["id"]
        await client.patch(f"/api/v1/appointments/{new_appt_id}", json={"status": "completed"}, headers=headers)

    resp = await client.get(f"/api/v1/staff-goals/staff/{staff_id}", headers=headers)
    our_goal = [g for g in resp.json() if g["id"] == goal_id][0]
    assert our_goal["current_value"] == 500.0
    assert our_goal["progress_percentage"] == 100.0
    assert our_goal["is_completed"] is True
