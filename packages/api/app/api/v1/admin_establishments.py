"""Admin establishment endpoints."""

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select

from app.api.deps import AdminUser, DBSession
from app.api.v1.establishments import EstablishmentListResponse, establishment_to_response
from app.models import Establishment, EstablishmentStatus, SubscriptionTier, User

router = APIRouter(prefix="/admin/establishments", tags=["Admin Establishments"])


class AdminEstablishmentUpdate(BaseModel):
    """Admin update for establishment moderation."""

    status: EstablishmentStatus | None = None
    subscription_tier: SubscriptionTier | None = None


class AdminEstablishmentDetailResponse(BaseModel):
    """Establishment detail with owner info for admin."""

    establishment: dict
    owner: dict | None = None
    stats: dict


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

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(Establishment.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    establishments = result.scalars().all()

    return EstablishmentListResponse(
        items=[establishment_to_response(e) for e in establishments],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{establishment_id}", response_model=AdminEstablishmentDetailResponse)
async def get_establishment_admin(
    establishment_id: UUID,
    db: DBSession,
    admin: AdminUser,
):
    """Get establishment detail for admin."""
    result = await db.execute(select(Establishment).where(Establishment.id == establishment_id))
    est = result.scalar_one_or_none()
    if not est:
        raise HTTPException(status_code=404, detail="Estabelecimento não encontrado")

    owner_result = await db.execute(select(User).where(User.id == est.owner_id))
    owner = owner_result.scalar_one_or_none()

    from app.models.appointment import Appointment
    from app.models.staff import StaffMember
    from app.models.service import Service

    appt_count = await db.scalar(
        select(func.count()).select_from(Appointment).where(Appointment.establishment_id == est.id)
    )
    staff_count = await db.scalar(
        select(func.count()).select_from(StaffMember).where(StaffMember.establishment_id == est.id)
    )
    service_count = await db.scalar(
        select(func.count()).select_from(Service).where(Service.establishment_id == est.id)
    )

    return AdminEstablishmentDetailResponse(
        establishment=establishment_to_response(est).model_dump(mode="json"),
        owner={
            "id": str(owner.id),
            "name": owner.name,
            "phone": owner.phone,
            "email": owner.email,
            "role": owner.role.value,
        }
        if owner
        else None,
        stats={
            "appointments": appt_count or 0,
            "staff": staff_count or 0,
            "services": service_count or 0,
        },
    )


@router.patch("/{establishment_id}", status_code=200)
async def update_establishment_admin(
    establishment_id: UUID,
    data: AdminEstablishmentUpdate,
    db: DBSession,
    admin: AdminUser,
):
    """Update establishment status or subscription tier (admin)."""
    result = await db.execute(select(Establishment).where(Establishment.id == establishment_id))
    est = result.scalar_one_or_none()
    if not est:
        raise HTTPException(status_code=404, detail="Estabelecimento não encontrado")

    if data.status is not None:
        est.status = data.status
    if data.subscription_tier is not None:
        est.subscription_tier = data.subscription_tier

    await db.commit()
    await db.refresh(est)
    return {
        "message": "Estabelecimento atualizado.",
        "establishment": establishment_to_response(est).model_dump(mode="json"),
    }


@router.patch("/{establishment_id}/approve", status_code=200)
async def approve_establishment(
    establishment_id: UUID,
    db: DBSession,
    admin: AdminUser,
):
    """Approve a pending establishment."""
    result = await db.execute(select(Establishment).where(Establishment.id == establishment_id))
    est = result.scalar_one_or_none()
    if not est:
        raise HTTPException(status_code=404, detail="Estabelecimento não encontrado")

    est.status = EstablishmentStatus.active
    await db.commit()
    return {"message": f"Estabelecimento '{est.name}' aprovado com sucesso."}
