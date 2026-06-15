"""Analytics endpoints."""

from datetime import date, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, verify_establishment_owner
from app.models.user import User
from app.services.analytics_service import AnalyticsService
from app.schemas.promotion import MonetizationSummaryResponse
from app.services.monetization_service import MonetizationService

router = APIRouter()


@router.get("/establishments/{establishment_id}/dashboard")
async def get_dashboard(
    establishment_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    start_date: date = Query(default_factory=lambda: date.today() - timedelta(days=30)),
    end_date: date = Query(default_factory=lambda: date.today()),
):
    """Get dashboard analytics for an establishment."""
    await verify_establishment_owner(db, establishment_id, current_user)

    service = AnalyticsService(db)
    return await service.get_establishment_dashboard(establishment_id, start_date, end_date)


@router.get(
    "/establishments/{establishment_id}/monetization",
    response_model=MonetizationSummaryResponse,
)
async def get_monetization_summary(
    establishment_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Tier, commission rate and pending platform fees for the owner."""
    await verify_establishment_owner(db, establishment_id, current_user)
    service = MonetizationService(db)
    summary = await service.get_tier_summary(establishment_id)
    return MonetizationSummaryResponse(**summary)
