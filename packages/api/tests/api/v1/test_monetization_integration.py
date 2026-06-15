"""Tests for monetization: wallet fee, promotions, ad campaigns, summary."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from httpx import AsyncClient


async def _fund_wallet(client: AsyncClient, auth_headers: dict, amount: float = 500.0) -> None:
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
async def test_wallet_payment_accrues_platform_fee(client: AsyncClient, auth_headers: dict):
    """Wallet pay should record platform_fee and expose pending fees to owner."""
    await _fund_wallet(client, auth_headers)
    business_hours = {
        d: {"open": "08:00", "close": "20:00"} for d in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    }
    est = await client.post(
        "/api/v1/establishments",
        json={
            "name": f"Wallet Fee {uuid4().hex[:4]}",
            "category": "barbershop",
            "address": "Rua Wallet",
            "city": "SP",
            "state": "SP",
            "phone": "+551155555555",
            "business_hours": business_hours,
        },
        headers=auth_headers,
    )
    assert est.status_code == 201
    est_id = est.json()["id"]

    svc = await client.post(
        f"/api/v1/establishments/{est_id}/services",
        json={"name": "Corte", "price": 100.0, "duration_minutes": 30},
        headers=auth_headers,
    )
    service_id = svc.json()["id"]

    staff = await client.post(
        f"/api/v1/establishments/{est_id}/staff",
        json={"name": "Barber", "phone": "+551166666666", "role": "barber"},
        headers=auth_headers,
    )
    staff_id = staff.json()["id"]

    today = datetime.now(UTC)
    days_ahead = 0 - today.weekday()
    if days_ahead <= 0:
        days_ahead += 7
    slot = (today + timedelta(days=days_ahead)).replace(hour=10, minute=0, second=0, microsecond=0)

    appt = await client.post(
        "/api/v1/appointments",
        json={
            "establishment_id": est_id,
            "service_id": service_id,
            "staff_id": staff_id,
            "scheduled_at": slot.isoformat(),
            "payment_method": "wallet",
            "payment_type": "single",
        },
        headers=auth_headers,
    )
    assert appt.status_code == 201, appt.text

    summary = await client.get(
        f"/api/v1/analytics/establishments/{est_id}/monetization",
        headers=auth_headers,
    )
    assert summary.status_code == 200, summary.text
    data = summary.json()
    assert data["subscription_tier"] == "trial"
    assert data["commission_percent"] == 5.0
    assert data["pending_platform_fees"] == 5.0


@pytest.mark.asyncio
async def test_promotion_crud(client: AsyncClient, auth_headers: dict):
    """Owner can create and list active promotions."""
    business_hours = {
        d: {"open": "08:00", "close": "20:00"} for d in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    }
    est = await client.post(
        "/api/v1/establishments",
        json={
            "name": f"Promo Shop {uuid4().hex[:4]}",
            "category": "barbershop",
            "address": "Rua Promo",
            "city": "SP",
            "state": "SP",
            "phone": "+551177777777",
            "business_hours": business_hours,
        },
        headers=auth_headers,
    )
    est_id = est.json()["id"]
    now = datetime.now(UTC)
    promo = await client.post(
        f"/api/v1/establishments/{est_id}/promotions",
        json={
            "title": "20% off",
            "description": "Semana promo",
            "discount_percent": 20,
            "starts_at": now.isoformat(),
            "ends_at": (now + timedelta(days=7)).isoformat(),
        },
        headers=auth_headers,
    )
    assert promo.status_code == 201, promo.text
    promo_id = promo.json()["id"]

    listed = await client.get(f"/api/v1/establishments/{est_id}/promotions")
    assert listed.status_code == 200
    assert any(p["id"] == promo_id for p in listed.json())

    updated = await client.patch(
        f"/api/v1/establishments/{est_id}/promotions/{promo_id}",
        json={"active": False},
        headers=auth_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["active"] is False


@pytest.mark.asyncio
async def test_ad_campaign_sets_sponsored(client: AsyncClient, auth_headers: dict):
    """Active ad campaign marks establishment as sponsored."""
    business_hours = {
        d: {"open": "08:00", "close": "20:00"} for d in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    }
    est = await client.post(
        "/api/v1/establishments",
        json={
            "name": f"Sponsored {uuid4().hex[:4]}",
            "category": "barbershop",
            "address": "Rua Ads",
            "city": "SP",
            "state": "SP",
            "phone": "+551188888888",
            "business_hours": business_hours,
        },
        headers=auth_headers,
    )
    est_id = est.json()["id"]
    today = datetime.now(UTC).date()

    campaign = await client.post(
        f"/api/v1/establishments/{est_id}/ad-campaigns",
        json={
            "name": "Boost SP",
            "budget_daily": 50.0,
            "start_date": today.isoformat(),
            "active": True,
        },
        headers=auth_headers,
    )
    assert campaign.status_code == 201, campaign.text

    summary = await client.get(
        f"/api/v1/analytics/establishments/{est_id}/monetization",
        headers=auth_headers,
    )
    assert summary.status_code == 200
    assert summary.json()["is_sponsored"] is True


@pytest.mark.asyncio
async def test_promotion_discount_on_appointment(client: AsyncClient, auth_headers: dict):
    """Active promotion reduces appointment total_price."""
    business_hours = {
        d: {"open": "08:00", "close": "20:00"} for d in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    }
    est = await client.post(
        "/api/v1/establishments",
        json={
            "name": f"Discount {uuid4().hex[:4]}",
            "category": "barbershop",
            "address": "Rua Desc",
            "city": "SP",
            "state": "SP",
            "phone": "+551199999999",
            "business_hours": business_hours,
        },
        headers=auth_headers,
    )
    est_id = est.json()["id"]
    svc = await client.post(
        f"/api/v1/establishments/{est_id}/services",
        json={"name": "Corte", "price": 100.0, "duration_minutes": 30},
        headers=auth_headers,
    )
    service_id = svc.json()["id"]
    staff = await client.post(
        f"/api/v1/establishments/{est_id}/staff",
        json={"name": "Pro", "phone": "+551188877766", "role": "barber"},
        headers=auth_headers,
    )
    staff_id = staff.json()["id"]
    now = datetime.now(UTC)
    promo = await client.post(
        f"/api/v1/establishments/{est_id}/promotions",
        json={
            "title": "20% off",
            "discount_percent": 20,
            "starts_at": now.isoformat(),
            "ends_at": (now + timedelta(days=7)).isoformat(),
        },
        headers=auth_headers,
    )
    promo_id = promo.json()["id"]

    today = datetime.now(UTC)
    days_ahead = 0 - today.weekday()
    if days_ahead <= 0:
        days_ahead += 7
    slot = (today + timedelta(days=days_ahead)).replace(hour=11, minute=0, second=0, microsecond=0)

    appt = await client.post(
        "/api/v1/appointments",
        json={
            "establishment_id": est_id,
            "service_id": service_id,
            "staff_id": staff_id,
            "scheduled_at": slot.isoformat(),
            "payment_type": "single",
            "promotion_id": promo_id,
        },
        headers=auth_headers,
    )
    assert appt.status_code == 201, appt.text
    assert appt.json()["total_price"] == 80.0
    assert appt.json()["discount_amount"] == 20.0


@pytest.mark.asyncio
async def test_platform_saas_payment(client: AsyncClient, auth_headers: dict):
    """Owner pays platform SaaS from wallet and extends subscription."""
    await _fund_wallet(client, auth_headers, 100.0)
    business_hours = {
        d: {"open": "08:00", "close": "20:00"} for d in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    }
    est = await client.post(
        "/api/v1/establishments",
        json={
            "name": f"SaaS {uuid4().hex[:4]}",
            "category": "barbershop",
            "address": "Rua SaaS",
            "city": "SP",
            "state": "SP",
            "phone": "+551122222222",
            "business_hours": business_hours,
        },
        headers=auth_headers,
    )
    est_id = est.json()["id"]
    assert est.json()["subscription_tier"] == "trial"

    status = await client.get(
        f"/api/v1/establishments/{est_id}/platform-subscription",
        headers=auth_headers,
    )
    assert status.status_code == 200
    assert status.json()["is_platform_subscription_active"] is True
    assert status.json()["platform_saas_monthly_price"] == 29.99

    paid = await client.post(
        f"/api/v1/establishments/{est_id}/platform-subscription/pay",
        headers=auth_headers,
    )
    assert paid.status_code == 200, paid.text
    assert paid.json()["amount_paid"] == 29.99
    assert paid.json()["subscription_tier"] == "bronze"
    assert paid.json()["platform_subscription_expires_at"] is not None


@pytest.mark.asyncio
async def test_platform_auto_renew_wallet(client: AsyncClient, auth_headers: dict):
    """Auto-renew charges owner wallet before expiry."""
    await _fund_wallet(client, auth_headers, 100.0)
    business_hours = {
        d: {"open": "08:00", "close": "20:00"} for d in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    }
    est = await client.post(
        "/api/v1/establishments",
        json={
            "name": f"Renew {uuid4().hex[:4]}",
            "category": "barbershop",
            "address": "Rua Renew",
            "city": "SP",
            "state": "SP",
            "phone": "+551133333333",
            "business_hours": business_hours,
        },
        headers=auth_headers,
    )
    est_id = est.json()["id"]

    enabled = await client.patch(
        f"/api/v1/establishments/{est_id}/platform-subscription/auto-renew",
        json={"enabled": True},
        headers=auth_headers,
    )
    assert enabled.status_code == 200
    assert enabled.json()["platform_auto_renew"] is True

    from app.core.database import async_session_maker
    from app.models.establishment import Establishment
    from app.services.monetization_service import MonetizationService
    from sqlalchemy import select

    async with async_session_maker() as db:
        result = await db.execute(select(Establishment).where(Establishment.id == est_id))
        establishment = result.scalar_one()
        old_expires = datetime.now(UTC) + timedelta(days=2)
        establishment.platform_subscription_expires_at = old_expires
        await db.commit()

        mon = MonetizationService(db)
        renewed = await mon.process_auto_renewals()
        assert renewed == 1

        await db.refresh(establishment)
        assert establishment.platform_subscription_expires_at > old_expires + timedelta(days=29)


@pytest.mark.asyncio
async def test_ad_campaign_summary_and_targeting(client: AsyncClient, auth_headers: dict):
    """Owner configures destaque with geo targeting; summary and clicks work."""
    from app.core.database import async_session_maker
    from app.models.establishment import Establishment, EstablishmentStatus
    from sqlalchemy import select

    business_hours = {
        d: {"open": "08:00", "close": "20:00"} for d in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    }
    est = await client.post(
        "/api/v1/establishments",
        json={
            "name": f"Geo Ads {uuid4().hex[:4]}",
            "category": "barbershop",
            "address": "Rua Geo",
            "city": "São Paulo",
            "state": "SP",
            "phone": "+551144444444",
            "business_hours": business_hours,
            "latitude": -23.5505,
            "longitude": -46.6333,
        },
        headers=auth_headers,
    )
    assert est.status_code == 201, est.text
    est_id = est.json()["id"]

    async with async_session_maker() as db:
        result = await db.execute(select(Establishment).where(Establishment.id == est_id))
        establishment = result.scalar_one()
        establishment.status = EstablishmentStatus.active
        await db.commit()

    today = datetime.now(UTC).date()

    campaign = await client.post(
        f"/api/v1/establishments/{est_id}/ad-campaigns",
        json={
            "name": "SP Centro",
            "budget_daily": 100.0,
            "start_date": today.isoformat(),
            "target_radius_km": 20,
            "target_cities": ["São Paulo"],
            "placement": "search_top",
            "priority": 50,
            "cost_per_impression": 0.05,
            "active": True,
        },
        headers=auth_headers,
    )
    assert campaign.status_code == 201, campaign.text
    camp_id = campaign.json()["id"]
    assert campaign.json()["placement"] == "search_top"
    assert campaign.json()["priority"] == 50

    summary = await client.get(
        f"/api/v1/establishments/{est_id}/ad-campaigns/summary",
        headers=auth_headers,
    )
    assert summary.status_code == 200, summary.text
    body = summary.json()
    assert body["is_sponsored"] is True
    assert body["active_campaigns"] == 1
    assert len(body["campaigns"]) == 1

    search = await client.get(
        "/api/v1/establishments",
        params={"lat": -23.5505, "lng": -46.6333, "city": "São Paulo", "page_size": 50},
    )
    assert search.status_code == 200
    item = next((i for i in search.json()["items"] if i["id"] == est_id), None)
    assert item is not None
    assert item["is_sponsored"] is True

    click = await client.get(
        f"/api/v1/establishments/{est_id}",
        params={"track_click": True, "lat": -23.5505, "lng": -46.6333, "city": "São Paulo"},
    )
    assert click.status_code == 200

    summary2 = await client.get(
        f"/api/v1/establishments/{est_id}/ad-campaigns/summary",
        headers=auth_headers,
    )
    assert summary2.json()["total_clicks"] >= 1

    outside = await client.get(
        "/api/v1/establishments",
        params={"lat": -22.9056, "lng": -47.0608, "city": "Campinas", "page_size": 50},
    )
    assert outside.status_code == 200
    outside_item = next((i for i in outside.json()["items"] if i["id"] == est_id), None)
    if outside_item:
        assert outside_item["is_sponsored"] is False

    await client.patch(
        f"/api/v1/establishments/{est_id}/ad-campaigns/{camp_id}",
        json={"active": False, "status": "paused"},
        headers=auth_headers,
    )
    summary3 = await client.get(
        f"/api/v1/establishments/{est_id}/ad-campaigns/summary",
        headers=auth_headers,
    )
    assert summary3.json()["is_sponsored"] is False


@pytest.mark.asyncio
async def test_ad_campaign_budget_exhaustion(client: AsyncClient, auth_headers: dict):
    """Daily budget exhaustion marks campaign as exhausted."""
    from app.core.database import async_session_maker
    from app.models.establishment import Establishment, EstablishmentStatus
    from app.models.plugin import AdCampaign
    from sqlalchemy import select

    business_hours = {
        d: {"open": "08:00", "close": "20:00"} for d in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    }
    est = await client.post(
        "/api/v1/establishments",
        json={
            "name": f"Budget {uuid4().hex[:4]}",
            "category": "barbershop",
            "address": "Rua Budget",
            "city": "SP",
            "state": "SP",
            "phone": "+551155566666",
            "business_hours": business_hours,
        },
        headers=auth_headers,
    )
    est_id = est.json()["id"]

    async with async_session_maker() as db:
        result = await db.execute(select(Establishment).where(Establishment.id == est_id))
        establishment = result.scalar_one()
        establishment.status = EstablishmentStatus.active
        await db.commit()

    today = datetime.now(UTC).date()

    campaign = await client.post(
        f"/api/v1/establishments/{est_id}/ad-campaigns",
        json={
            "budget_daily": 0.04,
            "cost_per_impression": 0.05,
            "start_date": today.isoformat(),
            "active": True,
        },
        headers=auth_headers,
    )
    assert campaign.status_code == 201

    await client.get(
        "/api/v1/establishments",
        params={"page_size": 50, "lat": -23.5505, "lng": -46.6333, "city": "SP"},
    )

    async with async_session_maker() as db:
        result = await db.execute(
            select(AdCampaign).where(AdCampaign.establishment_id == est_id)
        )
        camp = result.scalar_one()
        assert camp.status == "exhausted"
        assert float(camp.spent_today) == 0.0

    monetization = await client.get(
        f"/api/v1/analytics/establishments/{est_id}/monetization",
        headers=auth_headers,
    )
    assert monetization.json()["is_sponsored"] is False
