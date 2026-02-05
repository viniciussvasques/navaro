from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_cancellation_fee_and_debt_recovery(client: AsyncClient):
    """
    Test the full cycle of late cancellation:
    1. Create establishment with 15.00 cancellation fee.
    2. Create appointment.
    3. Cancel late (< 30 min) -> Verify debt created.
    4. Create new appointment.
    5. Create payment intent -> Verify total = base + debt.
    """

    # ─── 1. Setup User & Establishment ───────────────────────────────────────
    phone = "+5511999999999"
    resp = await client.post("/api/v1/auth/send-code", json={"phone": phone})
    code = resp.json()["message"].split(": ")[1].strip()
    resp = await client.post("/api/v1/auth/verify", json={"phone": phone, "code": code})
    user = resp.json()
    token = user["tokens"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create Establishment with Cancellation Fee and Business Hours (required for AppointmentService)
    est_resp = await client.post(
        "/api/v1/establishments",
        json={
            "name": "Fee Barbershop",
            "category": "barbershop",
            "address": "Debt St",
            "city": "São Paulo",
            "state": "SP",
            "phone": "+551188888888",
            "cancellation_fee_fixed": 15.0,
            "business_hours": {
                "mon": {"open": "00:00", "close": "23:59"},
                "tue": {"open": "00:00", "close": "23:59"},
                "wed": {"open": "00:00", "close": "23:59"},
                "thu": {"open": "00:00", "close": "23:59"},
                "fri": {"open": "00:00", "close": "23:59"},
                "sat": {"open": "00:00", "close": "23:59"},
                "sun": {"open": "00:00", "close": "23:59"},
            },
        },
        headers=headers,
    )
    assert est_resp.status_code == 201
    establishment = est_resp.json()
    est_id = establishment["id"]

    # Create Service (R$ 50,00)
    svc_resp = await client.post(
        f"/api/v1/establishments/{est_id}/services",
        json={"name": "Quick Cut", "price": 50.0, "duration_minutes": 30},
        headers=headers,
    )
    assert svc_resp.status_code == 201
    service = svc_resp.json()
    svc_id = service["id"]

    # Create Staff
    staff_resp = await client.post(
        f"/api/v1/establishments/{est_id}/staff",
        json={
            "name": "John Doe",
            "role": "barber",
            "work_schedule": {
                "mon": {"open": "00:00", "close": "23:59"},
                "tue": {"open": "00:00", "close": "23:59"},
                "wed": {"open": "00:00", "close": "23:59"},
                "thu": {"open": "00:00", "close": "23:59"},
                "fri": {"open": "00:00", "close": "23:59"},
                "sat": {"open": "00:00", "close": "23:59"},
                "sun": {"open": "00:00", "close": "23:59"},
            },
        },
        headers=headers,
    )
    assert staff_resp.status_code == 201
    staff = staff_resp.json()
    staff_id = staff["id"]

    # ─── 2. Create Appointment 1 (LATE CANCEL) ───────────────────────────────
    # Schedule for 15 minutes from now
    scheduled_at = (datetime.now() + timedelta(minutes=15)).isoformat()

    appt_resp = await client.post(
        "/api/v1/appointments",
        json={
            "establishment_id": est_id,
            "service_id": svc_id,
            "staff_id": staff_id,
            "scheduled_at": scheduled_at,
            "payment_type": "single",
        },
        headers=headers,
    )
    assert appt_resp.status_code == 201
    appt1_id = appt_resp.json()["id"]

    # Cancel Late
    cancel_resp = await client.delete(f"/api/v1/appointments/{appt1_id}", headers=headers)
    assert cancel_resp.status_code == 204

    # ─── 3. Create Appointment 2 & Check Fee Recovery ────────────────────────
    # Schedule another one for tomorrow
    scheduled_at2 = (datetime.now() + timedelta(days=1)).isoformat()

    appt2_resp = await client.post(
        "/api/v1/appointments",
        json={
            "establishment_id": est_id,
            "service_id": svc_id,
            "staff_id": staff_id,
            "scheduled_at": scheduled_at2,
            "payment_type": "single",
        },
        headers=headers,
    )
    assert appt2_resp.status_code == 201
    appt2_id = appt2_resp.json()["id"]

    # Mock Stripe and test payment intent creation
    with patch("stripe.PaymentIntent.create") as mock_stripe:
        mock_stripe.return_value = MagicMock(id="pi_test_123", client_secret="secret_123")

        intent_resp = await client.post(
            "/api/v1/payments/create-intent", json={"appointment_id": appt2_id}, headers=headers
        )

        assert intent_resp.status_code == 200
        data = intent_resp.json()

        # Total should be Service (50.0) + Late Fee (15.0) = 65.0
        assert data["amount"] == 65.0

        # Verify metadata in stripe call
        args, kwargs = mock_stripe.call_args
        assert kwargs["amount"] == 6500  # 65.00 in cents
        assert "debt_ids" in kwargs["metadata"]
