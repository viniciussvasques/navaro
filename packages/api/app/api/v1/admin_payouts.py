"""Admin payout endpoints."""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select

from app.api.deps import AdminUser, DBSession
from app.models.establishment import Establishment
from app.models.payment import Payout, PayoutStatus

router = APIRouter(prefix="/admin/payouts", tags=["Admin Payouts"])


class PayoutItemResponse(BaseModel):
    """Single payout item for admin list."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    establishment_id: UUID
    establishment_name: str | None = None
    amount: float
    status: str
    created_at: datetime
    paid_at: datetime | None = None


class PayoutListResponse(BaseModel):
    """Paginated list of payouts."""

    items: list[PayoutItemResponse]
    total: int
    page: int
    page_size: int


@router.get("", response_model=PayoutListResponse)
async def list_all_payout_requests(
    db: DBSession,
    admin: AdminUser,
    status: PayoutStatus | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """List all payout requests across the platform (admin only)."""
    query = select(Payout)

    if status:
        query = query.where(Payout.status == status)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate and order by newest
    query = query.order_by(Payout.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    payouts = result.scalars().all()

    est_ids = {p.establishment_id for p in payouts}
    est_names: dict = {}
    if est_ids:
        est_res = await db.execute(
            select(Establishment.id, Establishment.name).where(Establishment.id.in_(est_ids))
        )
        est_names = {row.id: row.name for row in est_res.all()}

    return PayoutListResponse(
        items=[
            PayoutItemResponse(
                id=p.id,
                establishment_id=p.establishment_id,
                establishment_name=est_names.get(p.establishment_id),
                amount=float(p.amount),
                status=p.status.value,
                created_at=p.created_at,
                paid_at=getattr(p, "paid_at", None),
            )
            for p in payouts
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.patch("/{payout_id}/approve", status_code=200)
async def approve_payout(
    payout_id: UUID,
    db: DBSession,
    admin: AdminUser,
):
    """Approve and mark a payout as completed."""
    result = await db.execute(select(Payout).where(Payout.id == payout_id))
    payout = result.scalar_one_or_none()
    if not payout:
        raise HTTPException(status_code=404, detail="Solicitação de saque não encontrada")

    if payout.status != PayoutStatus.pending:
        raise HTTPException(
            status_code=400, detail="Apenas solicitações pendentes podem ser aprovadas"
        )

    payout.status = PayoutStatus.succeeded
    await db.commit()
    return {"message": "Saque aprovado e marcado como concluído."}
