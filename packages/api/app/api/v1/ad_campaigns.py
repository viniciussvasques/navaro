"""Ad campaign endpoints — owner self-service destaque."""

from uuid import UUID

from fastapi import APIRouter, Query, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.exceptions import ForbiddenError, NotFoundError
from app.models import Establishment, UserRole
from app.models.plugin import AdCampaign
from app.schemas.promotion import (
    AdCampaignCreate,
    AdCampaignResponse,
    AdCampaignSummary,
    AdCampaignUpdate,
)
from app.services.promotion_service import AdCampaignService

router = APIRouter(
    prefix="/establishments/{establishment_id}/ad-campaigns",
    tags=["Ad Campaigns"],
)


async def _get_establishment_or_404(db: DBSession, establishment_id: UUID) -> Establishment:
    result = await db.execute(select(Establishment).where(Establishment.id == establishment_id))
    establishment = result.scalar_one_or_none()
    if not establishment:
        raise NotFoundError("Estabelecimento")
    return establishment


def _check_ownership(establishment: Establishment, user: CurrentUser) -> None:
    if establishment.owner_id != user.id and user.role != UserRole.admin:
        raise ForbiddenError()


def _to_response(campaign: AdCampaign) -> AdCampaignResponse:
    return AdCampaignResponse.model_validate(campaign)


@router.get("/summary", response_model=AdCampaignSummary)
async def ad_campaign_summary(
    establishment_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> AdCampaignSummary:
    """Dashboard: impressions, clicks, spend, active campaigns."""
    establishment = await _get_establishment_or_404(db, establishment_id)
    _check_ownership(establishment, current_user)
    service = AdCampaignService(db)
    data = await service.get_summary(establishment_id)
    return AdCampaignSummary(
        active_campaigns=data["active_campaigns"],
        total_impressions=data["total_impressions"],
        total_clicks=data["total_clicks"],
        total_spent=data["total_spent"],
        is_sponsored=data["is_sponsored"],
        campaigns=[_to_response(c) for c in data["campaigns"]],
    )


@router.get("", response_model=list[AdCampaignResponse])
async def list_ad_campaigns(
    establishment_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> list[AdCampaignResponse]:
    """List ad campaigns (owner/admin)."""
    establishment = await _get_establishment_or_404(db, establishment_id)
    _check_ownership(establishment, current_user)
    service = AdCampaignService(db)
    campaigns = await service.list_for_establishment(establishment_id)
    return [_to_response(c) for c in campaigns]


@router.post("", response_model=AdCampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_ad_campaign(
    establishment_id: UUID,
    data: AdCampaignCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> AdCampaignResponse:
    """Create destaque campaign with coverage, budget and placement."""
    establishment = await _get_establishment_or_404(db, establishment_id)
    _check_ownership(establishment, current_user)
    service = AdCampaignService(db)
    campaign = await service.create(establishment_id, data)
    return _to_response(campaign)


@router.patch("/{campaign_id}", response_model=AdCampaignResponse)
async def update_ad_campaign(
    establishment_id: UUID,
    campaign_id: UUID,
    data: AdCampaignUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> AdCampaignResponse:
    """Update destaque campaign (owner/admin)."""
    establishment = await _get_establishment_or_404(db, establishment_id)
    _check_ownership(establishment, current_user)
    existing = await db.execute(
        select(AdCampaign).where(
            AdCampaign.id == campaign_id,
            AdCampaign.establishment_id == establishment_id,
        )
    )
    if not existing.scalar_one_or_none():
        raise NotFoundError("Campanha")
    service = AdCampaignService(db)
    campaign = await service.update(campaign_id, data)
    if not campaign:
        raise NotFoundError("Campanha")
    return _to_response(campaign)


@router.post("/{campaign_id}/click", status_code=status.HTTP_204_NO_CONTENT)
async def record_campaign_click(
    establishment_id: UUID,
    campaign_id: UUID,
    db: DBSession,
    lat: float | None = Query(None),
    lng: float | None = Query(None),
    city: str | None = Query(None),
) -> None:
    """Track click when customer opens establishment profile."""
    service = AdCampaignService(db)
    await service.record_click(
        establishment_id, campaign_id, user_lat=lat, user_lng=lng, user_city=city
    )
