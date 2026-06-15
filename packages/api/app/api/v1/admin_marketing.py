"""Admin marketing overview — promotions and ad campaigns (Fresha/Booksy-style)."""

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Query
from pydantic import BaseModel
from sqlalchemy import desc, func, select
from sqlalchemy.orm import selectinload

from app.api.deps import AdminUser, DBSession
from app.core.exceptions import NotFoundError
from app.models.establishment import Establishment
from app.models.plugin import AdCampaign
from app.models.promotion import Promotion
from app.schemas.promotion import AdCampaignCreate, AdCampaignResponse, AdCampaignUpdate
from app.services.promotion_service import AdCampaignService

router = APIRouter(prefix="/admin/marketing", tags=["Admin Marketing"])


def _as_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def _promo_is_active(promo: Promotion, now: datetime) -> bool:
    if not promo.active:
        return False
    starts = _as_utc(promo.starts_at)
    ends = _as_utc(promo.ends_at)
    return starts <= now <= ends


def _safe_city_list(value: object) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v) for v in value]
    return []


class AdminPromotionItem(BaseModel):
    id: UUID
    establishment_id: UUID
    establishment_name: str
    title: str
    discount_percent: float | None
    discount_fixed: float | None
    starts_at: datetime
    ends_at: datetime
    active: bool


class AdminCampaignItem(BaseModel):
    id: UUID
    establishment_id: UUID
    establishment_name: str
    name: str | None
    budget_daily: float
    budget_total: float | None
    spent_today: float
    total_spent: float
    impressions: int
    clicks: int
    active: bool
    status: str
    placement: str
    priority: int
    target_radius_km: float
    target_cities: list[str]
    start_date: str
    end_date: str | None


class AdminMarketingOverview(BaseModel):
    active_promotions: int
    active_campaigns: int
    sponsored_establishments: int
    promotions: list[AdminPromotionItem]
    campaigns: list[AdminCampaignItem]


@router.get("/overview", response_model=AdminMarketingOverview)
async def marketing_overview(
    db: DBSession,
    admin: AdminUser,
    limit: int = Query(20, ge=1, le=100),
) -> AdminMarketingOverview:
    """Platform-wide promotions and sponsored listings overview."""
    now = datetime.now(UTC)

    promo_q = (
        select(Promotion)
        .options(selectinload(Promotion.establishment))
        .order_by(desc(Promotion.created_at))
        .limit(limit)
    )
    promos = (await db.execute(promo_q)).scalars().all()

    camp_q = (
        select(AdCampaign)
        .options(selectinload(AdCampaign.establishment))
        .order_by(desc(AdCampaign.created_at))
        .limit(limit)
    )
    campaigns = (await db.execute(camp_q)).scalars().all()

    active_promos = sum(1 for p in promos if _promo_is_active(p, now))
    active_camps = sum(1 for c in campaigns if c.active)

    sponsored_q = select(func.count()).select_from(Establishment).where(
        Establishment.is_sponsored == True  # noqa: E712
    )
    sponsored = (await db.execute(sponsored_q)).scalar() or 0

    return AdminMarketingOverview(
        active_promotions=active_promos,
        active_campaigns=active_camps,
        sponsored_establishments=sponsored,
        promotions=[
            AdminPromotionItem(
                id=p.id,
                establishment_id=p.establishment_id,
                establishment_name=p.establishment.name if p.establishment else "—",
                title=p.title,
                discount_percent=float(p.discount_percent) if p.discount_percent else None,
                discount_fixed=float(p.discount_fixed) if p.discount_fixed else None,
                starts_at=p.starts_at,
                ends_at=p.ends_at,
                active=p.active,
            )
            for p in promos
        ],
        campaigns=[
            AdminCampaignItem(
                id=c.id,
                establishment_id=c.establishment_id,
                establishment_name=c.establishment.name if c.establishment else "—",
                name=c.name,
                budget_daily=float(c.budget_daily),
                budget_total=float(c.budget_total) if c.budget_total is not None else None,
                spent_today=float(c.spent_today or 0),
                total_spent=float(c.total_spent or 0),
                impressions=c.impressions,
                clicks=c.clicks,
                active=c.active,
                status=c.status or "active",
                placement=c.placement or "search_top",
                priority=int(c.priority or 0),
                target_radius_km=float(c.target_radius_km or 15),
                target_cities=_safe_city_list(c.target_cities),
                start_date=c.start_date.isoformat(),
                end_date=c.end_date.isoformat() if c.end_date else None,
            )
            for c in campaigns
        ],
    )


class AdminCampaignCreateRequest(AdCampaignCreate):
    """Admin creates a highlight/ad campaign for any establishment."""

    establishment_id: UUID


@router.post("/campaigns", response_model=AdCampaignResponse, status_code=201)
async def admin_create_campaign(
    data: AdminCampaignCreateRequest,
    db: DBSession,
    admin: AdminUser,
) -> AdCampaignResponse:
    """Create sponsored highlight campaign (admin). Activates top-of-search destaque."""
    est = await db.get(Establishment, data.establishment_id)
    if not est:
        raise NotFoundError("Estabelecimento")

    payload = AdCampaignCreate.model_validate(
        data.model_dump(exclude={"establishment_id"})
    )
    if not payload.name:
        payload = payload.model_copy(update={"name": f"Destaque — {est.name}"})

    service = AdCampaignService(db)
    campaign = await service.create(data.establishment_id, payload)
    return AdCampaignResponse.model_validate(campaign)


@router.patch("/campaigns/{campaign_id}", response_model=AdCampaignResponse)
async def admin_update_campaign(
    campaign_id: UUID,
    data: AdCampaignUpdate,
    db: DBSession,
    admin: AdminUser,
) -> AdCampaignResponse:
    """Toggle or update highlight campaign (admin)."""
    existing = await db.get(AdCampaign, campaign_id)
    if not existing:
        raise NotFoundError("Campanha")

    service = AdCampaignService(db)
    campaign = await service.update(campaign_id, data)
    if not campaign:
        raise NotFoundError("Campanha")
    return AdCampaignResponse.model_validate(campaign)
