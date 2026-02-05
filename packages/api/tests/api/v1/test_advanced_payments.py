import pytest
from datetime import datetime, timedelta
from httpx import AsyncClient
from uuid import UUID

@pytest.mark.asyncio
async def test_no_show_and_wallet_flow(client: AsyncClient):
    # ─── 1. Setup ────────────────────────────────────────────────────────────
    phone = "+5511988887777"
    resp = await client.post("/api/v1/auth/send-code", json={"phone": phone})
    code = resp.json()["message"].split(": ")[1].strip()
    resp = await client.post("/api/v1/auth/verify", json={"phone": phone, "code": code})
    token = resp.json()["tokens"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create Establishment with 50% No-Show Fee
    est_resp = await client.post("/api/v1/establishments", json={
        "name": "Advanced Barbershop",
        "category": "barbershop",
        "address": "Feature St",
        "city": "São Paulo",
        "state": "SP",
        "phone": "+551177777777",
        "no_show_fee_percent": 50.0,
        "business_hours": {day: {"open": "00:00", "close": "23:59"} for day in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]}
    }, headers=headers)
    est_id = est_resp.json()["id"]
    
    # Create Staff
    staff_resp = await client.post(f"/api/v1/establishments/{est_id}/staff", json={
        "name": "Expert Barber",
        "role": "barber",
        "work_schedule": {day: {"open": "00:00", "close": "23:59"} for day in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]}
    }, headers=headers)
    staff_id = staff_resp.json()["id"]
    
    # Create Service (R$ 100,00)
    svc_resp = await client.post(f"/api/v1/establishments/{est_id}/services", json={
        "name": "Luxury Cut",
        "price": 100.0,
        "duration_minutes": 60,
        "deposit_required": True
    }, headers=headers)
    svc_id = svc_resp.json()["id"]

    # ─── 2. Test Deposit Requirement ─────────────────────────────────────────
    appt_resp = await client.post("/api/v1/appointments", json={
        "establishment_id": est_id,
        "service_id": svc_id,
        "staff_id": staff_id,
        "scheduled_at": (datetime.now() + timedelta(days=2)).isoformat(),
        "payment_type": "single"
    }, headers=headers)
    assert appt_resp.status_code == 201
    appointment = appt_resp.json()
    # Status should be awaiting_deposit because svc.deposit_required=True
    assert appointment["status"] == "awaiting_deposit"
    appt_id = appointment["id"]

    # ─── 3. Test No-Show Penalty ─────────────────────────────────────────────
    # Manually mark as no-show (we skip the checks for staff role for this test)
    no_show_resp = await client.post(f"/api/v1/appointments/{appt_id}/no-show", headers=headers)
    assert no_show_resp.status_code == 200
    
    # Check if debt was created (50% of 100.0 = 50.0)
    # Actually we can check it via a new appointment intent
    appt2_resp = await client.post("/api/v1/appointments", json={
        "establishment_id": est_id,
        "service_id": svc_id,
        "staff_id": staff_id,
        "scheduled_at": (datetime.now() + timedelta(days=3)).isoformat(),
        "payment_type": "single"
    }, headers=headers)
    appt2_id = appt2_resp.json()["id"]
    
    # Create intent should now be R$ 20 (deposit 20% of 100) + R$ 50 (debt) = R$ 70
    # Note: Establishment deposit_percent defaults to 0, but Service.deposit_required defaults to 20% in PaymentService if est is 0
    from unittest.mock import patch, MagicMock
    with patch("stripe.PaymentIntent.create") as mock_stripe:
        mock_stripe.return_value = MagicMock(id="pi_debt", client_secret="secret_debt")
        intent_resp = await client.post("/api/v1/payments/create-intent", json={"appointment_id": appt2_id}, headers=headers)
        assert intent_resp.status_code == 200
        # Deposit (20) + Debt (50) = 70
        assert intent_resp.json()["amount"] == 70.0

    # ─── 5. Test Cash Payment and Debt Recovery ──────────────────────────────
    # Create an appointment with CASH payment method
    cash_appt_resp = await client.post("/api/v1/appointments", json={
        "establishment_id": est_id,
        "service_id": svc_id,
        "staff_id": staff_id,
        "scheduled_at": (datetime.now() + timedelta(days=4)).isoformat(),
        "payment_type": "single",
        "payment_method": "cash"
    }, headers=headers)
    assert cash_appt_resp.status_code == 201
    cash_appt_id = cash_appt_resp.json()["id"]
    
    # Mark as no-show
    await client.post(f"/api/v1/appointments/{cash_appt_id}/no-show", headers=headers)
    
    # Now create a new appt with CARD and check if intent includes debt from CASH appt
    card_appt_resp = await client.post("/api/v1/appointments", json={
        "establishment_id": est_id,
        "service_id": svc_id,
        "staff_id": staff_id,
        "scheduled_at": (datetime.now() + timedelta(days=5)).isoformat(),
        "payment_type": "single",
        "payment_method": "card"
    }, headers=headers)
    card_appt_id = card_appt_resp.json()["id"]
    
    with patch("stripe.PaymentIntent.create") as mock_stripe:
        mock_stripe.return_value = MagicMock(id="pi_double_debt", client_secret="secret_double_debt")
        intent_resp = await client.post("/api/v1/payments/create-intent", json={"appointment_id": card_appt_id}, headers=headers)
        assert intent_resp.status_code == 200
        # Service (100) -> Deposit (20) + Debt1 (50) + Debt_Cash (50) = 120
        # Note: Previous test already left a 50 debt. total should be 120.
        assert intent_resp.json()["amount"] == 120.0
