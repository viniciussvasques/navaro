"""Admin payments endpoints — list all platform payments."""

from fastapi import APIRouter
from sqlalchemy import func, select

from app.api.deps import AdminUser, DBSession
from app.models.establishment import Establishment
from app.models.payment import Payment

router = APIRouter(prefix="/admin/payments", tags=["Admin Payments"])


@router.get("")
async def list_all_payments(
    admin: AdminUser,
    db: DBSession,
    page: int = 1,
    page_size: int = 100,
    status: str | None = None,
    provider: str | None = None,
) -> dict:
    """List all payments across the platform (admin only)."""
    query = select(Payment)

    if status:
        query = query.where(Payment.status == status)
    if provider:
        query = query.where(Payment.provider == provider)

    # Count
    count_query = select(func.count()).select_from(
        query.subquery()
    )
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    # Paginate
    query = query.order_by(Payment.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    payments = result.scalars().all()

    est_ids = {p.establishment_id for p in payments if p.establishment_id}
    est_names: dict = {}
    if est_ids:
        est_res = await db.execute(
            select(Establishment.id, Establishment.name).where(Establishment.id.in_(est_ids))
        )
        est_names = {row.id: row.name for row in est_res.all()}

    items = []
    for p in payments:
        items.append({
            "id": str(p.id),
            "user_id": str(p.user_id) if p.user_id else None,
            "establishment_id": str(p.establishment_id) if p.establishment_id else None,
            "establishment_name": est_names.get(p.establishment_id, "—"),
            "appointment_id": str(p.appointment_id) if p.appointment_id else None,
            "amount": float(p.amount or 0),
            "platform_fee": float(p.platform_fee or 0),
            "gateway_fee": float(p.gateway_fee or 0),
            "net_amount": float(p.net_amount or 0),
            "status": p.status.value if hasattr(p.status, "value") else str(p.status),
            "provider": p.provider or "",
            "purpose": p.purpose.value if hasattr(p.purpose, "value") else str(p.purpose or ""),
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })

    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/stats")
async def payment_stats(
    admin: AdminUser,
    db: DBSession,
) -> dict:
    """Get aggregated payment statistics."""
    from datetime import UTC, datetime, timedelta

    now = datetime.now(UTC)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    start_of_week = now - timedelta(days=now.weekday())
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Total
    total_q = select(
        func.count(Payment.id).label("count"),
        func.coalesce(func.sum(Payment.amount), 0).label("volume"),
        func.coalesce(func.sum(Payment.platform_fee), 0).label("fees"),
    ).where(Payment.status == "succeeded")

    total_r = await db.execute(total_q)
    total_row = total_r.one()

    # Month
    month_q = total_q.where(Payment.created_at >= start_of_month)
    month_r = await db.execute(month_q)
    month_row = month_r.one()

    # Today
    day_q = select(
        func.count(Payment.id).label("count"),
        func.coalesce(func.sum(Payment.amount), 0).label("volume"),
    ).where(Payment.status == "succeeded", Payment.created_at >= start_of_day)
    day_r = await db.execute(day_q)
    day_row = day_r.one()

    # Provider breakdown
    provider_q = select(
        Payment.provider,
        func.count(Payment.id).label("count"),
    ).group_by(Payment.provider)
    provider_r = await db.execute(provider_q)
    providers = {row.provider or "unknown": row.count for row in provider_r}

    return {
        "total_volume": float(total_row.volume),
        "total_fees": float(total_row.fees),
        "total_count": total_row.count,
        "month_volume": float(month_row.volume),
        "month_fees": float(month_row.fees),
        "month_count": month_row.count,
        "today_count": day_row.count,
        "today_volume": float(day_row.volume),
        "providers": providers,
    }
