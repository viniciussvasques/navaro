"""Admin payout endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func

from app.api.deps import AdminUser, DBSession
from app.models.payment import Payout, PayoutStatus
from app.api.v1.payouts import PayoutResponse

router = APIRouter(prefix="/admin/payouts", tags=["Admin Payouts"])


@router.get("", response_model=dict)
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
    
    return {
        "items": payouts,
        "total": total,
        "page": page,
        "page_size": page_size
    }

@router.patch("/{payout_id}/approve", status_code=200)
async def approve_payout(
    payout_id: UUID,
    db: DBSession,
    admin: AdminUser
):
    """Approve and mark a payout as completed."""
    result = await db.execute(select(Payout).where(Payout.id == payout_id))
    payout = result.scalar_one_or_none()
    if not payout:
        raise HTTPException(status_code=404, detail="Solicitação de saque não encontrada")
    
    if payout.status != PayoutStatus.pending:
        raise HTTPException(status_code=400, detail="Apenas solicitações pendentes podem ser aprovadas")
    
    payout.status = PayoutStatus.completed
    await db.commit()
    return {"message": "Saque aprovado e marcado como concluído."}
