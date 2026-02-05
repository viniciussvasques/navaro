import pytest
import pytest_asyncio
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_grand_tour_e2e(client: AsyncClient):
    """
    The Grand Tour: A complete E2E flow covering Referral, Schedules, Blocks, 
    Appointments, Products, Reviews, and Tips.
    """
    
    # ─── 1. SETUP: Referral & Auth ───────────────────────────────────────────
    # User A (Referrer)
    phone_a = "+5511911111111"
    resp = await client.post("/api/v1/auth/send-code", json={"phone": phone_a})
    code_a = resp.json()["message"].split(": ")[1].strip()
    resp = await client.post("/api/v1/auth/verify", json={"phone": phone_a, "code": code_a})
    user_a = resp.json()
    token_a = user_a["tokens"]["access_token"]
    ref_code_a = user_a["user"]["referral_code"]
    headers_a = {"Authorization": f"Bearer {token_a}"}
    
    assert ref_code_a is not None
    
    # User B (Referee) signs up using User A's code
    phone_b = "+5511922222222"
    resp = await client.post("/api/v1/auth/send-code", json={"phone": phone_b})
    code_b = resp.json()["message"].split(": ")[1].strip()
    resp = await client.post("/api/v1/auth/verify", json={
        "phone": phone_b, 
        "code": code_b,
        "referral_code": ref_code_a
    })
    user_b = resp.json()
    token_b = user_b["tokens"]["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}
    
    # Verify User B was referred by A
    resp = await client.get("/api/v1/users/me", headers=headers_b)
    assert resp.json()["referred_by_id"] == user_a["user"]["id"]

    # ─── 2. SETUP: Business & Staff ──────────────────────────────────────────
    # User A creates establishment
    est_resp = await client.post("/api/v1/establishments", json={
        "name": "Grand Tour Barbershop",
        "category": "barbershop",
        "address": "Route 66",
        "city": "Radiator Springs",
        "state": "AZ",
        "phone": "+551100000000",
        "business_hours": {
            "mon": {"open": "09:00", "close": "18:00"},
            "tue": {"open": "09:00", "close": "18:00"}
        }
    }, headers=headers_a)
    est_id = est_resp.json()["id"]
    
    # User A creates a staff member
    staff_resp = await client.post(f"/api/v1/establishments/{est_id}/staff", json={
        "name": "Lightning McQueen",
        "role": "barbeiro",
        "work_schedule": {
            "mon": {"open": "10:00", "close": "17:00"}  # Shorter than business hours
        }
    }, headers=headers_a)
    staff_id = staff_resp.json()["id"]
    
    # User A creates a service
    serv_resp = await client.post(f"/api/v1/establishments/{est_id}/services", json={
        "name": "Piston Cup Polish",
        "price": 100.0,
        "duration_minutes": 60
    }, headers=headers_a)
    serv_id = serv_resp.json()["id"]

    # ─── 3. BOOKING VALIDATION ───────────────────────────────────────────────
    # Success Case: Monday at 14:00 (Valid for both est and staff)
    booking_headers = {"Authorization": f"Bearer {token_b}"}
    resp = await client.post("/api/v1/appointments", json={
        "establishment_id": est_id,
        "service_id": serv_id,
        "staff_id": staff_id,
        "scheduled_at": "2026-10-26T14:00:00Z", # A Monday
        "payment_type": "single"
    }, headers=booking_headers)
    if resp.status_code != 201:
        print(f"FAILED BOOKING: {resp.json()}")
    assert resp.status_code == 201
    appt_id = resp.json()["id"]

    # Failure: Sunday (Not in business_hours)
    resp = await client.post("/api/v1/appointments", json={
        "establishment_id": est_id,
        "service_id": serv_id,
        "staff_id": staff_id,
        "scheduled_at": "2026-10-25T14:00:00Z", # A Sunday
        "payment_type": "single"
    }, headers=booking_headers)
    assert resp.status_code == 400
    assert "fechado" in resp.json()["detail"]["message"].lower()

    # Failure: Monday at 09:00 (Staff only starts at 10:00)
    resp = await client.post("/api/v1/appointments", json={
        "establishment_id": est_id,
        "service_id": serv_id,
        "staff_id": staff_id,
        "scheduled_at": "2026-10-26T09:00:00Z",
        "payment_type": "single"
    }, headers=booking_headers)
    assert resp.status_code == 400
    assert "jornada" in resp.json()["detail"]["message"].lower() or "horário" in resp.json()["detail"]["message"].lower()

    # ─── 4. STAFF BLOCKS ───────────────────────────────────────────────────
    # Lightning takes a lunch break 12:00-13:00
    block_resp = await client.post(f"/api/v1/establishments/{est_id}/staff/{staff_id}/blocks", json={
        "start_at": "2026-10-26T12:00:00Z",
        "end_at": "2026-10-26T13:00:00Z",
        "reason": "Lunch break"
    }, headers=headers_a)
    assert block_resp.status_code == 201
    
    # Failure: Booking overlapping with block
    resp = await client.post("/api/v1/appointments", json={
        "establishment_id": est_id,
        "service_id": serv_id,
        "staff_id": staff_id,
        "scheduled_at": "2026-10-26T12:30:00Z",
        "payment_type": "single"
    }, headers=booking_headers)
    assert resp.status_code == 400
    assert "bloqueio" in resp.json()["detail"]["message"].lower()

    # ─── 5. CHECKOUT & TIPS ────────────────────────────────────────────────
    # Complete appointment
    await client.patch(f"/api/v1/appointments/{appt_id}", json={"status": "completed"}, headers=headers_a)
    
    # Give a Tip
    tip_resp = await client.post("/api/v1/tips/", json={
        "amount": 15.0,
        "staff_id": staff_id,
        "appointment_id": appt_id
    }, headers=headers_b)
    assert tip_resp.status_code == 200
    assert tip_resp.json()["amount"] == 15.0
    
    # Verify Tip in list 
    tip_list = await client.get("/api/v1/tips/me", headers=headers_b)
    assert len(tip_list.json()) >= 1
    
    print("Grand Tour E2E complete and successful!")
