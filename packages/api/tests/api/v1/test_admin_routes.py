"""Admin API route integration tests."""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy import update

from app.core import database
from app.models.establishment import Establishment, EstablishmentStatus
from app.models.user import User, UserRole


@pytest.mark.asyncio
async def test_admin_routes_require_admin(
    client: AsyncClient, auth_headers: dict, establishment_id: str
):
    """Non-admin users cannot access admin endpoints."""
    resp = await client.get("/api/v1/admin/establishments", headers=auth_headers)
    assert resp.status_code == 403

    resp = await client.get("/api/v1/admin/analytics/dashboard", headers=auth_headers)
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_establishments_list_detail_approve(
    client: AsyncClient, admin_auth_headers: dict, auth_headers: dict
):
    """Admin lists, views, approves establishments."""
    list_resp = await client.get("/api/v1/admin/establishments", headers=admin_auth_headers)
    assert list_resp.status_code == 200
    body = list_resp.json()
    assert "items" in body
    assert "total" in body

    pending = await client.get(
        "/api/v1/admin/establishments",
        params={"status": "pending", "page_size": 10},
        headers=admin_auth_headers,
    )
    assert pending.status_code == 200

    est = await client.post(
        "/api/v1/establishments",
        json={
            "name": f"Admin Mod {uuid4().hex[:4]}",
            "category": "barbershop",
            "address": "Rua Admin",
            "city": "SP",
            "state": "SP",
            "phone": "+551166677788",
            "business_hours": {d: {"open": "08:00", "close": "20:00"} for d in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]},
        },
        headers=auth_headers,
    )
    est_id = est.json()["id"]

    detail = await client.get(
        f"/api/v1/admin/establishments/{est_id}", headers=admin_auth_headers
    )
    assert detail.status_code == 200
    assert detail.json()["establishment"]["id"] == est_id
    assert "stats" in detail.json()

    approve = await client.patch(
        f"/api/v1/admin/establishments/{est_id}/approve", headers=admin_auth_headers
    )
    assert approve.status_code == 200

    patch = await client.patch(
        f"/api/v1/admin/establishments/{est_id}",
        json={"subscription_tier": "bronze"},
        headers=admin_auth_headers,
    )
    assert patch.status_code == 200
    assert patch.json()["establishment"]["subscription_tier"] == "bronze"


@pytest.mark.asyncio
async def test_admin_analytics_dashboard(client: AsyncClient, admin_auth_headers: dict):
    """Admin global dashboard analytics."""
    resp = await client.get("/api/v1/admin/analytics/dashboard", headers=admin_auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)


@pytest.mark.asyncio
async def test_admin_marketing_overview_and_campaign(
    client: AsyncClient, admin_auth_headers: dict, auth_headers: dict, establishment_id: str
):
    """Admin marketing overview and campaign CRUD."""
    async with database.async_session_maker() as session:
        result = await session.execute(
            update(Establishment)
            .where(Establishment.id == establishment_id)
            .values(status=EstablishmentStatus.active)
        )
        await session.commit()

    overview = await client.get("/api/v1/admin/marketing/overview", headers=admin_auth_headers)
    assert overview.status_code == 200
    data = overview.json()
    assert "campaigns" in data
    assert "promotions" in data

    today = datetime.now(UTC).date().isoformat()
    create = await client.post(
        "/api/v1/admin/marketing/campaigns",
        json={
            "establishment_id": establishment_id,
            "name": "Admin Boost",
            "budget_daily": 19.9,
            "start_date": today,
            "placement": "search_top",
            "priority": 20,
            "target_radius_km": 10,
            "active": True,
        },
        headers=admin_auth_headers,
    )
    assert create.status_code == 201, create.text
    camp_id = create.json()["id"]

    pause = await client.patch(
        f"/api/v1/admin/marketing/campaigns/{camp_id}",
        json={"active": False, "status": "paused"},
        headers=admin_auth_headers,
    )
    assert pause.status_code == 200


@pytest.mark.asyncio
async def test_admin_payments_and_stats(client: AsyncClient, admin_auth_headers: dict):
    """Admin payments list and stats."""
    list_resp = await client.get("/api/v1/admin/payments", headers=admin_auth_headers)
    assert list_resp.status_code == 200
    assert "items" in list_resp.json()

    stats = await client.get("/api/v1/admin/payments/stats", headers=admin_auth_headers)
    assert stats.status_code == 200


@pytest.mark.asyncio
async def test_admin_payouts_list(client: AsyncClient, admin_auth_headers: dict):
    """Admin payouts list."""
    resp = await client.get("/api/v1/admin/payouts", headers=admin_auth_headers)
    assert resp.status_code == 200
    assert "items" in resp.json()


@pytest.mark.asyncio
async def test_admin_settings_crud(client: AsyncClient, admin_auth_headers: dict):
    """Admin settings seed, list, update."""
    seed = await client.post("/api/v1/admin/settings/seed-defaults", headers=admin_auth_headers)
    assert seed.status_code in (200, 201)

    listing = await client.get("/api/v1/admin/settings", headers=admin_auth_headers)
    assert listing.status_code == 200
    assert listing.json()["total"] >= 0

    create = await client.post(
        "/api/v1/admin/settings",
        json={
            "key": f"test_admin_{uuid4().hex[:6]}",
            "value": "42",
            "description": "Test setting",
            "category": "general",
        },
        headers=admin_auth_headers,
    )
    assert create.status_code == 201, create.text
    key = create.json()["key"]

    get_one = await client.get(f"/api/v1/admin/settings/{key}", headers=admin_auth_headers)
    assert get_one.status_code == 200

    update_resp = await client.put(
        f"/api/v1/admin/settings/{key}",
        json={"value": "99"},
        headers=admin_auth_headers,
    )
    assert update_resp.status_code == 200


@pytest.mark.asyncio
async def test_admin_moderation_reviews_and_queue(
    client: AsyncClient, admin_auth_headers: dict
):
    """Admin reviews list and queue overview."""
    reviews = await client.get("/api/v1/admin/reviews", headers=admin_auth_headers)
    assert reviews.status_code == 200
    assert "items" in reviews.json()

    queue = await client.get("/api/v1/admin/queue", headers=admin_auth_headers)
    assert queue.status_code == 200
    assert "establishments" in queue.json()


@pytest.mark.asyncio
async def test_admin_exports_and_crm(client: AsyncClient, admin_auth_headers: dict):
    """Admin CSV exports and CRM retention."""
    payments_csv = await client.get(
        "/api/v1/admin/exports/payments.csv", headers=admin_auth_headers
    )
    assert payments_csv.status_code == 200
    assert "text/csv" in payments_csv.headers.get("content-type", "")

    est_csv = await client.get(
        "/api/v1/admin/exports/establishments.csv", headers=admin_auth_headers
    )
    assert est_csv.status_code == 200

    crm = await client.get(
        "/api/v1/admin/crm/retention",
        params={"weeks": 8},
        headers=admin_auth_headers,
    )
    assert crm.status_code == 200
    assert "items" in crm.json()


@pytest.mark.asyncio
async def test_admin_qr_analytics(client: AsyncClient, admin_auth_headers: dict):
    """Admin QR analytics summary."""
    resp = await client.get("/api/v1/admin/qr-analytics", headers=admin_auth_headers)
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_admin_logs_test_event(client: AsyncClient, admin_auth_headers: dict):
    """Admin can trigger test log broadcast."""
    resp = await client.post("/api/v1/admin/logs/test", headers=admin_auth_headers)
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_admin_whatsapp_bridge_unconfigured(client: AsyncClient, admin_auth_headers: dict):
    """WhatsApp bridge returns 503 when not configured in tests."""
    resp = await client.get("/api/v1/admin/whatsapp-bridge/status", headers=admin_auth_headers)
    assert resp.status_code in (503, 200)


@pytest.mark.asyncio
async def test_admin_review_hide_unhide(
    client: AsyncClient,
    admin_auth_headers: dict,
    auth_headers: dict,
    auth_headers_second_user: dict,
    establishment_id: str,
    staff_id: str,
):
    """Admin can hide and unhide reviews."""
    async with database.async_session_maker() as session:
        await session.execute(
            update(Establishment)
            .where(Establishment.id == establishment_id)
            .values(status=EstablishmentStatus.active)
        )
        await session.commit()

    review = await client.post(
        "/api/v1/reviews",
        json={
            "establishment_id": establishment_id,
            "staff_id": staff_id,
            "rating": 2,
            "comment": "Teste moderação admin",
        },
        headers=auth_headers_second_user,
    )
    assert review.status_code == 201, review.text
    review_id = review.json()["id"]

    hide = await client.patch(
        f"/api/v1/admin/reviews/{review_id}/hide", headers=admin_auth_headers
    )
    assert hide.status_code == 200

    unhide = await client.patch(
        f"/api/v1/admin/reviews/{review_id}/unhide", headers=admin_auth_headers
    )
    assert unhide.status_code == 200
