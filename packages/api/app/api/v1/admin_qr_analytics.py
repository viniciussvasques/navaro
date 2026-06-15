"""Admin QR Analytics endpoints."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Query
from sqlalchemy import case, func, select

from app.api.deps import AdminUser, DBSession
from app.models import Establishment
from app.models.qr_scan import QRScan
from app.schemas.qr_scan import AdminQRAnalyticsSummary, QRAnalytics

router = APIRouter(prefix="/admin/qr-analytics", tags=["Admin QR Analytics"])


@router.get(
    "",
    response_model=AdminQRAnalyticsSummary,
    summary="Get global QR analytics (admin)",
)
async def admin_qr_analytics(
    admin_user: AdminUser,
    db: DBSession,
    limit: int = Query(20, ge=1, le=100, description="Top N establishments"),
):
    """Get QR scan analytics across all establishments. Admin only."""

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)

    # Global totals
    totals_result = await db.execute(
        select(
            func.count(QRScan.id),
            func.sum(case((QRScan.converted_to_user == True, 1), else_=0)),  # noqa: E712
            func.sum(case((QRScan.converted_to_favorite == True, 1), else_=0)),  # noqa: E712
            func.sum(case((QRScan.converted_to_appointment == True, 1), else_=0)),  # noqa: E712
        )
    )
    row = totals_result.one()
    total_scans = row[0] or 0
    total_conversions_signup = row[1] or 0
    total_conversions_favorite = row[2] or 0
    total_conversions_appointment = row[3] or 0

    overall_conversion_rate = (
        (total_conversions_signup / total_scans * 100) if total_scans > 0 else 0.0
    )

    # Top establishments by total scans
    top_result = await db.execute(
        select(
            Establishment.id,
            Establishment.name,
            Establishment.slug,
            func.count(QRScan.id).label("total_scans"),
            func.count(func.distinct(QRScan.user_id)).label("unique_users"),
            func.sum(case((QRScan.converted_to_user == True, 1), else_=0)).label("conv_signup"),  # noqa: E712
            func.sum(case((QRScan.converted_to_favorite == True, 1), else_=0)).label("conv_fav"),  # noqa: E712
            func.sum(case((QRScan.converted_to_appointment == True, 1), else_=0)).label("conv_appt"),  # noqa: E712
            func.sum(
                case((QRScan.scanned_at >= today_start, 1), else_=0)
            ).label("scans_today"),
            func.sum(
                case((QRScan.scanned_at >= week_start, 1), else_=0)
            ).label("scans_week"),
            func.sum(
                case((QRScan.scanned_at >= month_start, 1), else_=0)
            ).label("scans_month"),
        )
        .join(Establishment, QRScan.establishment_id == Establishment.id)
        .group_by(Establishment.id, Establishment.name, Establishment.slug)
        .order_by(func.count(QRScan.id).desc())
        .limit(limit)
    )

    top_establishments = []
    for r in top_result.all():
        est_total = r.total_scans or 0
        est_conv = r.conv_signup or 0
        top_establishments.append(
            QRAnalytics(
                establishment_id=r.id,
                establishment_name=r.name,
                establishment_slug=r.slug,
                total_scans=est_total,
                unique_users=r.unique_users or 0,
                conversions_signup=est_conv,
                conversions_favorite=r.conv_fav or 0,
                conversions_appointment=r.conv_appt or 0,
                conversion_rate=round((est_conv / est_total * 100) if est_total > 0 else 0.0, 1),
                scans_today=r.scans_today or 0,
                scans_this_week=r.scans_week or 0,
                scans_this_month=r.scans_month or 0,
                platform_breakdown={},
                source_breakdown={},
            )
        )

    return AdminQRAnalyticsSummary(
        total_scans=total_scans,
        total_conversions_signup=total_conversions_signup,
        total_conversions_favorite=total_conversions_favorite,
        total_conversions_appointment=total_conversions_appointment,
        overall_conversion_rate=round(overall_conversion_rate, 1),
        top_establishments=top_establishments,
    )
