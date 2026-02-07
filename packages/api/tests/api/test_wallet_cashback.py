import pytest
from httpx import AsyncClient
from uuid import uuid4
from datetime import datetime, timedelta, UTC
from sqlalchemy import select, update
from app.models.user import User, UserRole
from app.models.system_settings import SettingsKeys
from app.database import get_db


async def promote_to_admin(email_or_phone: str, db):
    await db.execute(update(User).where(User.phone == email_or_phone).values(role=UserRole.admin))
    await db.commit()


@pytest.mark.asyncio
async def test_wallet_payment_flow(client: AsyncClient, auth_headers: dict, app):
    """Test paying for an appointment using wallet balance."""
    headers = auth_headers

    # 0. Promote to Admin & Add Balance
    async for db in app.dependency_overrides[get_db]():
        await promote_to_admin("+5511988888888", db)
        # Add Initial Balance
        from app.services.wallet_service import WalletService

        res = await db.execute(select(User.id).where(User.phone == "+5511988888888"))
        uid = res.scalar()
        ws = WalletService(db)
        await ws.add_balance(uid, 100.0, "Carga inicial")
        break

    # 1. Setup: Establishment, Service, Staff
    est_payload = {
        "name": f"Wallet Salon {uuid4().hex[:4]}",
        "category": "barbershop",
        "address": "Rua Wallet, 100",
        "city": "Sao Paulo",
        "state": "SP",
        "phone": "11966666666",
        "business_hours": {
            d: {"open": "00:00", "close": "23:59"}
            for d in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
        },
    }
    resp = await client.post("/api/v1/establishments", json=est_payload, headers=headers)
    est_id = resp.json()["id"]

    svc_resp = await client.post(
        f"/api/v1/establishments/{est_id}/services",
        json={"name": "Corte Wallet", "price": 50.0, "duration_minutes": 30},
        headers=headers,
    )
    svc_id = svc_resp.json()["id"]

    staff_resp = await client.post(
        f"/api/v1/establishments/{est_id}/staff",
        json={"name": "Barber Wallet", "role": "barber", "commission_rate": 20.0},
        headers=headers,
    )
    staff_id = staff_resp.json()["id"]

    # 2. Create Appointment with Wallet
    appt_payload = {
        "establishment_id": est_id,
        "service_id": svc_id,
        "staff_id": staff_id,
        "scheduled_at": (datetime.now(UTC) + timedelta(hours=2)).isoformat(),
        "payment_method": "wallet",
        "payment_type": "single",
    }
    appt_resp = await client.post("/api/v1/appointments", json=appt_payload, headers=headers)
    assert appt_resp.status_code == 201
    assert appt_resp.json()["status"] == "confirmed"

    # 3. Verify Balance Deducted (100 - 50 = 50)
    wallet_resp = await client.get("/api/v1/payments/wallet", headers=headers)
    assert float(wallet_resp.json()["balance"]) == 50.0

    # 4. Verify Payment Transaction
    trans_resp = await client.get("/api/v1/payments/wallet/transactions", headers=headers)
    assert any(t["type"] == "payment" and float(t["amount"]) == 50.0 for t in trans_resp.json())


@pytest.mark.asyncio
async def test_cashback_commission_and_referral(client: AsyncClient, auth_headers: dict, app):
    """Test full flow: Cashback for user, Commission for staff, Bonus for Referrer."""
    headers = auth_headers  # User A (Referred)

    # 0. Setup Referrer (User B)
    # We use auth_headers_second_user if available or just create one
    phone_b = "+5511977777777"
    await client.post("/api/v1/auth/send-code", json={"phone": phone_b})
    # In dev mode, we know the bypass or can check redis, but conftest handles it.
    # Let's assume we can get it from conftest-like login
    from app.core import redis as redis_module

    r = await redis_module.get_redis()
    code_b = await r.get(f"navaro:otp:{phone_b}")
    if hasattr(code_b, "decode"):
        code_b = code_b.decode()
    login_b = await client.post("/api/v1/auth/verify", json={"phone": phone_b, "code": code_b})
    token_b = login_b.json()["tokens"]["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}
    user_b_id = login_b.json()["user"]["id"]
    ref_code_b = login_b.json()["user"]["referral_code"]

    # Link User A to User B via Referral
    async for db in app.dependency_overrides[get_db]():
        await db.execute(
            update(User).where(User.phone == "+5511988888888").values(referred_by_id=user_b_id)
        )
        await promote_to_admin("+5511988888888", db)  # Make Admin to change settings
        # Link Staff member to a User for commission
        break

    # 1. Enable Features
    await client.post("/api/v1/admin/settings/seed-defaults", headers=headers)
    await client.put(
        f"/api/v1/admin/settings/{SettingsKeys.CASHBACK_ENABLED}",
        json={"value": "true"},
        headers=headers,
    )
    await client.put(
        f"/api/v1/admin/settings/{SettingsKeys.CASHBACK_PERCENT}",
        json={"value": "10.0"},
        headers=headers,
    )
    await client.put(
        "/api/v1/admin/settings/referral_bonus_amount", json={"value": "7.0"}, headers=headers
    )

    # 2. Setup Establishment
    est_payload = {
        "name": "Full Flow Salon",
        "category": "barbershop",
        "address": "Rua Full, 1",
        "city": "SP",
        "state": "SP",
        "phone": "11900000000",
        "business_hours": {
            d: {"open": "00:00", "close": "23:59"}
            for d in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
        },
    }
    est_resp = await client.post("/api/v1/establishments", json=est_payload, headers=headers)
    est_id = est_resp.json()["id"]
    svc_resp = await client.post(
        f"/api/v1/establishments/{est_id}/services",
        json={"name": "Corte Full", "price": 100.0, "duration_minutes": 30},
        headers=headers,
    )
    svc_id = svc_resp.json()["id"]

    # Create Staff with linked User for commission (link to User B for simplicity or C)
    staff_user_phone = "+5511966666666"
    await client.post("/api/v1/auth/send-code", json={"phone": staff_user_phone})
    r = await redis_module.get_redis()
    code_s = await r.get(f"navaro:otp:{staff_user_phone}")
    if hasattr(code_s, "decode"):
        code_s = code_s.decode()
    login_s = await client.post(
        "/api/v1/auth/verify", json={"phone": staff_user_phone, "code": code_s}
    )
    staff_uid = login_s.json()["user"]["id"]

    staff_resp = await client.post(
        f"/api/v1/establishments/{est_id}/staff",
        json={
            "name": "Staff Worker",
            "role": "barber",
            "commission_rate": 20.0,
            "user_id": staff_uid,
        },
        headers=headers,
    )
    staff_id = staff_resp.json()["id"]

    # 3. Complete Appointment
    appt_payload = {
        "establishment_id": est_id,
        "service_id": svc_id,
        "staff_id": staff_id,
        "scheduled_at": (datetime.now(UTC) + timedelta(hours=1)).isoformat(),
        "payment_method": "cash",
        "payment_type": "single",
    }
    appt_resp = await client.post("/api/v1/appointments", json=appt_payload, headers=headers)
    appt_id = appt_resp.json()["id"]

    await client.patch(
        f"/api/v1/appointments/{appt_id}", json={"status": "completed"}, headers=headers
    )

    # 4. Verifications
    # User A: 10% Cashback on 100 = 10.0
    w_a = await client.get("/api/v1/payments/wallet", headers=headers)
    assert float(w_a.json()["balance"]) == 10.0

    # User B (Referrer): 7.0 Bonus
    w_b = await client.get("/api/v1/payments/wallet", headers=headers_b)
    assert float(w_b.json()["balance"]) == 7.0

    # Staff User: 20% Commission on 100 = 20.0
    headers_s = {"Authorization": f"Bearer {login_s.json()['tokens']['access_token']}"}
    w_s = await client.get("/api/v1/payments/wallet", headers=headers_s)
    assert float(w_s.json()["balance"]) == 20.0
