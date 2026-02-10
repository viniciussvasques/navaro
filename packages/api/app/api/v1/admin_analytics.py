"""Admin analytics endpoints."""

from datetime import date, timedelta

from fastapi import APIRouter, Query

from app.api.deps import AdminUser, DBSession
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/admin/analytics", tags=["Admin Analytics"])


@router.get("/dashboard")
async def get_global_dashboard(
    db: DBSession,
    admin: AdminUser,
    start_date: date = Query(default_factory=lambda: date.today() - timedelta(days=30)),
    end_date: date = Query(default_factory=lambda: date.today()),
):
    """Get global system dashboard analytics (admin only)."""
    service = AnalyticsService(db)
    return await service.get_global_dashboard(start_date, end_date)
