"""Admin establishment endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, func

from app.api.deps import AdminUser, DBSession
from app.models import Establishment, EstablishmentStatus
from app.api.v1.establishments import (
    EstablishmentListResponse, 
    establishment_to_response,
    EstablishmentUpdate
)

router = APIRouter(prefix="/admin/establishments", tags=["Admin Establishments"])


@router.get("", response_model=EstablishmentListResponse)
async def list_establishments_admin(
    db: DBSession,
    admin: AdminUser,
    status: EstablishmentStatus | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    """List all establishments for admin moderation."""
    query = select(Establishment)
    
    if status:
        query = query.where(Establishment.status == status)
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Paginate and order by creation
    query = query.order_by(Establishment.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    establishments = result.scalars().all()
    
    return EstablishmentListResponse(
        items=[establishment_to_response(e) for e in establishments],
        total=total,
        page=page,
        page_size=page_size
    )

@router.patch("/{establishment_id}/approve", status_code=200)
async def approve_establishment(
    establishment_id: UUID,
    db: DBSession,
    admin: AdminUser
):
    """Approve a pending establishment."""
    result = await db.execute(select(Establishment).where(Establishment.id == establishment_id))
    est = result.scalar_one_or_none()
    if not est:
        raise HTTPException(status_code=404, detail="Estabelecimento não encontrado")
    
    est.status = EstablishmentStatus.active
    await db.commit()
    return {"message": f"Estabelecimento '{est.name}' aprovado com sucesso."}
