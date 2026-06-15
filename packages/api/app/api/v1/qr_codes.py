"""QR Code endpoints for establishments."""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Query, Request
from sqlalchemy import case, func, select

from app.api.deps import CurrentUser, DBSession, OptionalUser, OwnerUser
from app.core.config import settings
from app.core.exceptions import ForbiddenError, NotFoundError
from app.models import Establishment, UserRole
from app.models.qr_scan import QRScan
from app.schemas.qr_scan import QRAnalytics, QRCodeResponse, QRScanCreate, QRScanResponse

router = APIRouter(prefix="/qr", tags=["QR Codes"])

WEBSITE_URL = getattr(settings, "WEBSITE_URL", "https://dunnaa.com.br")


# ─── Generate QR info for an establishment ────────────────────────────────────


@router.get(
    "/establishments/{establishment_id}",
    response_model=QRCodeResponse,
    summary="Get QR code data for an establishment",
)
async def get_qr_code(
    establishment_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
):
    """Return the smart link and QR URL for an establishment.

    The Pro app can use this to generate / download QR codes.
    """
    result = await db.execute(
        select(Establishment).where(Establishment.id == establishment_id)
    )
    est = result.scalar_one_or_none()
    if not est:
        raise NotFoundError("Estabelecimento não encontrado")

    # Only owner/staff/admin can generate
    if (
        current_user.role not in (UserRole.admin, UserRole.support)
        and est.owner_id != current_user.id
    ):
        raise ForbiddenError("Sem permissão")

    smart_link = f"{WEBSITE_URL}/go/{est.slug}"

    return QRCodeResponse(
        establishment_id=est.id,
        establishment_name=est.name,
        slug=est.slug,
        qr_url=smart_link,
        smart_link=smart_link,
    )


# ─── Register a QR scan (called from landing page / app) ─────────────────────


@router.post(
    "/scan/{establishment_slug}",
    response_model=QRScanResponse,
    summary="Register a QR code scan",
)
async def register_scan(
    establishment_slug: str,
    request: Request,
    db: DBSession,
    data: QRScanCreate | None = None,
    user: OptionalUser = None,
):
    """Register that someone scanned an establishment's QR code.

    Called from the smart link landing page.
    """
    result = await db.execute(
        select(Establishment).where(Establishment.slug == establishment_slug)
    )
    est = result.scalar_one_or_none()
    if not est:
        raise NotFoundError("Estabelecimento não encontrado")

    # Detect platform from user-agent
    ua = request.headers.get("user-agent", "")
    platform = "unknown"
    ua_lower = ua.lower()
    if "android" in ua_lower:
        platform = "android"
    elif "iphone" in ua_lower or "ipad" in ua_lower or "ipod" in ua_lower:
        platform = "ios"
    elif "mobile" not in ua_lower:
        platform = "web"

    scan = QRScan(
        establishment_id=est.id,
        user_id=user.id if user else None,
        user_agent=ua[:500] if ua else None,
        ip_address=request.client.host if request.client else None,
        platform=platform,
        source=data.source if data else "poster",
        converted_to_user=user is not None,
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)

    return QRScanResponse(
        id=scan.id,
        establishment_id=scan.establishment_id,
        user_id=scan.user_id,
        platform=scan.platform,
        source=scan.source,
        converted_to_user=scan.converted_to_user,
        converted_to_favorite=scan.converted_to_favorite,
        converted_to_appointment=scan.converted_to_appointment,
        scanned_at=scan.scanned_at,
    )


# ─── Analytics for establishment owner ────────────────────────────────────────


@router.get(
    "/analytics/{establishment_id}",
    response_model=QRAnalytics,
    summary="Get QR analytics for an establishment",
)
async def get_qr_analytics(
    establishment_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
):
    """Get scan analytics for an establishment (owner/admin only)."""
    result = await db.execute(
        select(Establishment).where(Establishment.id == establishment_id)
    )
    est = result.scalar_one_or_none()
    if not est:
        raise NotFoundError("Estabelecimento não encontrado")

    if (
        current_user.role not in (UserRole.admin, UserRole.support)
        and est.owner_id != current_user.id
    ):
        raise ForbiddenError("Sem permissão")

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)

    base = select(QRScan).where(QRScan.establishment_id == establishment_id)

    # Total scans
    total_result = await db.execute(
        select(func.count(QRScan.id)).where(
            QRScan.establishment_id == establishment_id
        )
    )
    total_scans = total_result.scalar() or 0

    # Unique users
    unique_result = await db.execute(
        select(func.count(func.distinct(QRScan.user_id))).where(
            QRScan.establishment_id == establishment_id,
            QRScan.user_id.isnot(None),
        )
    )
    unique_users = unique_result.scalar() or 0

    # Conversions
    conv_result = await db.execute(
        select(
            func.sum(case((QRScan.converted_to_user == True, 1), else_=0)),  # noqa: E712
            func.sum(case((QRScan.converted_to_favorite == True, 1), else_=0)),  # noqa: E712
            func.sum(case((QRScan.converted_to_appointment == True, 1), else_=0)),  # noqa: E712
        ).where(QRScan.establishment_id == establishment_id)
    )
    row = conv_result.one()
    conversions_signup = row[0] or 0
    conversions_favorite = row[1] or 0
    conversions_appointment = row[2] or 0

    # Time-based scans
    today_result = await db.execute(
        select(func.count(QRScan.id)).where(
            QRScan.establishment_id == establishment_id,
            QRScan.scanned_at >= today_start,
        )
    )
    scans_today = today_result.scalar() or 0

    week_result = await db.execute(
        select(func.count(QRScan.id)).where(
            QRScan.establishment_id == establishment_id,
            QRScan.scanned_at >= week_start,
        )
    )
    scans_this_week = week_result.scalar() or 0

    month_result = await db.execute(
        select(func.count(QRScan.id)).where(
            QRScan.establishment_id == establishment_id,
            QRScan.scanned_at >= month_start,
        )
    )
    scans_this_month = month_result.scalar() or 0

    # Platform breakdown
    platform_result = await db.execute(
        select(QRScan.platform, func.count(QRScan.id))
        .where(QRScan.establishment_id == establishment_id)
        .group_by(QRScan.platform)
    )
    platform_breakdown = {
        (row[0] or "unknown"): row[1] for row in platform_result.all()
    }

    # Source breakdown
    source_result = await db.execute(
        select(QRScan.source, func.count(QRScan.id))
        .where(QRScan.establishment_id == establishment_id)
        .group_by(QRScan.source)
    )
    source_breakdown = {
        (row[0] or "unknown"): row[1] for row in source_result.all()
    }

    conversion_rate = (conversions_signup / total_scans * 100) if total_scans > 0 else 0.0

    return QRAnalytics(
        establishment_id=est.id,
        establishment_name=est.name,
        establishment_slug=est.slug,
        total_scans=total_scans,
        unique_users=unique_users,
        conversions_signup=conversions_signup,
        conversions_favorite=conversions_favorite,
        conversions_appointment=conversions_appointment,
        conversion_rate=round(conversion_rate, 1),
        scans_today=scans_today,
        scans_this_week=scans_this_week,
        scans_this_month=scans_this_month,
        platform_breakdown=platform_breakdown,
        source_breakdown=source_breakdown,
    )
