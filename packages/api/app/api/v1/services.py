"""Service endpoints."""

from uuid import UUID

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import DBSession, CurrentUser
from app.core.exceptions import NotFoundError, ForbiddenError
from app.models import Establishment, Service, UserRole

router = APIRouter(prefix="/establishments/{establishment_id}/services", tags=["Services"])


# ─── Schemas ───────────────────────────────────────────────────────────────────


class ServiceCreate(BaseModel):
    """Create service request."""
    name: str = Field(..., min_length=2, max_length=200)
    description: str | None = Field(None, max_length=1000)
    price: float = Field(..., gt=0)
    duration_minutes: int = Field(30, ge=5, le=480)


class ServiceUpdate(BaseModel):
    """Update service request."""
    name: str | None = Field(None, max_length=200)
    description: str | None = Field(None, max_length=1000)
    price: float | None = Field(None, gt=0)
    duration_minutes: int | None = Field(None, ge=5)
    active: bool | None = None
    sort_order: int | None = None


class ServiceResponse(BaseModel):
    """Service response."""
    id: str
    name: str
    description: str | None
    price: float
    duration_minutes: int
    active: bool
    sort_order: int
    
    class Config:
        from_attributes = True


# ─── Helpers ───────────────────────────────────────────────────────────────────


async def get_establishment_or_404(db: DBSession, establishment_id: UUID) -> Establishment:
    """Get establishment or raise 404."""
    result = await db.execute(
        select(Establishment).where(Establishment.id == establishment_id)
    )
    establishment = result.scalar_one_or_none()
    if not establishment:
        raise NotFoundError("Estabelecimento")
    return establishment


def check_ownership(establishment: Establishment, user: CurrentUser) -> None:
    """Check if user owns the establishment."""
    if establishment.owner_id != user.id and user.role != UserRole.ADMIN:
        raise ForbiddenError()


# ─── Endpoints ─────────────────────────────────────────────────────────────────


@router.get("", response_model=list[ServiceResponse])
async def list_services(
    establishment_id: UUID,
    db: DBSession,
    active_only: bool = True,
) -> list[ServiceResponse]:
    """List services for an establishment."""
    query = select(Service).where(Service.establishment_id == establishment_id)
    
    if active_only:
        query = query.where(Service.active == True)
    
    query = query.order_by(Service.sort_order, Service.name)
    
    result = await db.execute(query)
    services = result.scalars().all()
    
    return [
        ServiceResponse(
            id=str(s.id),
            name=s.name,
            description=s.description,
            price=float(s.price),
            duration_minutes=s.duration_minutes,
            active=s.active,
            sort_order=s.sort_order,
        )
        for s in services
    ]


@router.post("", response_model=ServiceResponse, status_code=201)
async def create_service(
    establishment_id: UUID,
    request: ServiceCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> ServiceResponse:
    """Create new service."""
    establishment = await get_establishment_or_404(db, establishment_id)
    check_ownership(establishment, current_user)
    
    service = Service(
        establishment_id=establishment_id,
        name=request.name,
        description=request.description,
        price=request.price,
        duration_minutes=request.duration_minutes,
    )
    
    db.add(service)
    await db.commit()
    await db.refresh(service)
    
    return ServiceResponse(
        id=str(service.id),
        name=service.name,
        description=service.description,
        price=float(service.price),
        duration_minutes=service.duration_minutes,
        active=service.active,
        sort_order=service.sort_order,
    )


@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(
    establishment_id: UUID,
    service_id: UUID,
    db: DBSession,
) -> ServiceResponse:
    """Get service by ID."""
    result = await db.execute(
        select(Service).where(
            Service.id == service_id,
            Service.establishment_id == establishment_id,
        )
    )
    service = result.scalar_one_or_none()
    
    if not service:
        raise NotFoundError("Serviço")
    
    return ServiceResponse(
        id=str(service.id),
        name=service.name,
        description=service.description,
        price=float(service.price),
        duration_minutes=service.duration_minutes,
        active=service.active,
        sort_order=service.sort_order,
    )


@router.patch("/{service_id}", response_model=ServiceResponse)
async def update_service(
    establishment_id: UUID,
    service_id: UUID,
    request: ServiceUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> ServiceResponse:
    """Update service."""
    establishment = await get_establishment_or_404(db, establishment_id)
    check_ownership(establishment, current_user)
    
    result = await db.execute(
        select(Service).where(
            Service.id == service_id,
            Service.establishment_id == establishment_id,
        )
    )
    service = result.scalar_one_or_none()
    
    if not service:
        raise NotFoundError("Serviço")
    
    for field, value in request.model_dump(exclude_unset=True).items():
        setattr(service, field, value)
    
    await db.commit()
    await db.refresh(service)
    
    return ServiceResponse(
        id=str(service.id),
        name=service.name,
        description=service.description,
        price=float(service.price),
        duration_minutes=service.duration_minutes,
        active=service.active,
        sort_order=service.sort_order,
    )


@router.delete("/{service_id}", status_code=204)
async def delete_service(
    establishment_id: UUID,
    service_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> None:
    """Delete service (soft delete)."""
    establishment = await get_establishment_or_404(db, establishment_id)
    check_ownership(establishment, current_user)
    
    result = await db.execute(
        select(Service).where(
            Service.id == service_id,
            Service.establishment_id == establishment_id,
        )
    )
    service = result.scalar_one_or_none()
    
    if not service:
        raise NotFoundError("Serviço")
    
    service.active = False
    await db.commit()
