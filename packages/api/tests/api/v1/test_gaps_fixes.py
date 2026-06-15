"""Tests for gap-fix features: subscriptions, search, reschedule."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from httpx import AsyncClient


async def _fund_wallet(client: AsyncClient, auth_headers: dict, amount: float = 200.0) -> None:
    from app.core.database import async_session_maker
    from app.core.security import decode_access_token
    from app.models.wallet import TransactionType
    from app.services.wallet_service import WalletService

    token = auth_headers["Authorization"].split(" ")[1]
    user_id = decode_access_token(token)
    async with async_session_maker() as db:
        ws = WalletService(db)
        await ws.add_balance(user_id, amount, "Fundos teste", tx_type=TransactionType.deposit)


@pytest.mark.asyncio
async def test_subscription_wallet_flow(client: AsyncClient, auth_headers: dict):
    """Subscribe via wallet, list, cancel."""
    await _fund_wallet(client, auth_headers)

    business_hours = {
        d: {"open": "08:00", "close": "20:00"} for d in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    }
    est = await client.post(
        "/api/v1/establishments",
        json={
            "name": f"Sub Salon {uuid4().hex[:4]}",
            "category": "barbershop",
            "address": "Rua Sub",
            "city": "SP",
            "state": "SP",
            "phone": "+551144444444",
            "business_hours": business_hours,
        },
        headers=auth_headers,
    )
    assert est.status_code == 201
    est_id = est.json()["id"]

    svc = await client.post(
        f"/api/v1/establishments/{est_id}/services",
        json={"name": "Corte Sub", "price": 40.0, "duration_minutes": 30},
        headers=auth_headers,
    )
    service_id = svc.json()["id"]

    plan = await client.post(
        f"/api/v1/establishments/{est_id}/subscription-plans",
        json={
            "name": "Plano Mensal",
            "description": "4 cortes",
            "price": 99.0,
            "items": [{"service_id": service_id, "quantity_per_month": 4}],
        },
        headers=auth_headers,
    )
    assert plan.status_code == 201, plan.text
    plan_id = plan.json()["id"]

    sub = await client.post(
        "/api/v1/subscriptions",
        json={"plan_id": plan_id, "payment_method": "wallet"},
        headers=auth_headers,
    )
    assert sub.status_code == 201, sub.text
    sub_id = sub.json()["id"]
    assert sub.json()["usage"]["max_uses_per_month"] == 4

    listed = await client.get("/api/v1/subscriptions", headers=auth_headers)
    assert listed.status_code == 200
    assert any(s["id"] == sub_id for s in listed.json())

    cancelled = await client.delete(f"/api/v1/subscriptions/{sub_id}", headers=auth_headers)
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"


@pytest.mark.asyncio
async def test_search_by_name_and_history(client: AsyncClient, auth_headers: dict):
    """Search with q parameter and search history."""
    business_hours = {
        d: {"open": "08:00", "close": "20:00"} for d in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    }
    unique = f"BuscaUnica{uuid4().hex[:6]}"
    est = await client.post(
        "/api/v1/establishments",
        json={
            "name": unique,
            "category": "barbershop",
            "address": "Rua X",
            "city": "Curitiba",
            "state": "PR",
            "phone": "+551155555555",
            "business_hours": business_hours,
        },
        headers=auth_headers,
    )
    assert est.status_code == 201
    est_id = est.json()["id"]
    await client.patch(
        f"/api/v1/establishments/{est_id}",
        json={"status": "active"},
        headers=auth_headers,
    )

    resp = await client.get(f"/api/v1/establishments?q={unique}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1

    hist = await client.get("/api/v1/search/history", headers=auth_headers)
    assert hist.status_code == 200
    assert any(unique in h["query"] for h in hist.json())


@pytest.mark.asyncio
async def test_reschedule_appointment(
    client: AsyncClient,
    auth_headers: dict,
    establishment_id: str,
    service_id: str,
    staff_id: str,
):
    """Reschedule via PATCH scheduled_at."""
    today = datetime.now(UTC)
    days_ahead = 0 - today.weekday()
    if days_ahead <= 0:
        days_ahead += 7
    monday = today + timedelta(days=days_ahead)
    slot1 = monday.replace(hour=10, minute=0, second=0, microsecond=0)
    slot2 = monday.replace(hour=14, minute=0, second=0, microsecond=0)

    create = await client.post(
        "/api/v1/appointments",
        json={
            "establishment_id": establishment_id,
            "service_id": service_id,
            "staff_id": staff_id,
            "scheduled_at": slot1.isoformat(),
            "payment_type": "single",
        },
        headers=auth_headers,
    )
    assert create.status_code == 201
    appt_id = create.json()["id"]

    patch = await client.patch(
        f"/api/v1/appointments/{appt_id}",
        json={"scheduled_at": slot2.isoformat()},
        headers=auth_headers,
    )
    assert patch.status_code == 200, patch.text
    assert "T14:00" in patch.json()["scheduled_at"] or slot2.strftime("%H:%M") in patch.json()["scheduled_at"]
