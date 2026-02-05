"""Establishment endpoints."""

from uuid import UUID

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from slugify import slugify

from app.api.deps import DBSession, CurrentUser, OwnerUser, OptionalUser
from app.core.exceptions import NotFoundError, AlreadyExistsError, ForbiddenError
from app.models import (
    Establishment,
    EstablishmentCategory,
    EstablishmentStatus,
    SubscriptionTier,
    UserRole,
)

router = APIRouter(prefix="/establishments", tags=["Establishments"])


# ─── Schemas ───────────────────────────────────────────────────────────────────


class EstablishmentCreate(BaseModel):
    """Create establishment request."""
    name: str = Field(..., min_length=2, max_length=200)
    category: EstablishmentCategory
    description: str | None = Field(None, max_length=1000)
    address: str = Field(..., max_length=500)
    city: str = Field(..., max_length=100)
    state: str = Field(..., min_length=2, max_length=2)
    zip_code: str | None = Field(None, max_length=10)
    phone: str = Field(..., max_length=20)
    whatsapp: str | None = Field(None, max_length=20)


class EstablishmentUpdate(BaseModel):
    """Update establishment request."""
    name: str | None = Field(None, max_length=200)
    description: str | None = Field(None, max_length=1000)
    address: str | None = Field(None, max_length=500)
    city: str | None = Field(None, max_length=100)
    state: str | None = Field(None, max_length=2)
    zip_code: str | None = Field(None, max_length=10)
    phone: str | None = Field(None, max_length=20)
    whatsapp: str | None = Field(None, max_length=20)
    logo_url: str | None = Field(None, max_length=500)
    cover_url: str | None = Field(None, max_length=500)
    business_hours: dict | None = None
    queue_mode_enabled: bool | None = None


class EstablishmentResponse(BaseModel):
    """Establishment response."""
    id: str
    name: str
    slug: str
    category: str
    description: str | None
    address: str
    city: str
    state: str
    zip_code: str | None
    phone: str
    whatsapp: str | None
    logo_url: str | None
    cover_url: str | None
    business_hours: dict
    queue_mode_enabled: bool
    status: str
    subscription_tier: str
    
    class Config:
        from_attributes = True


class EstablishmentListResponse(BaseModel):
    """Establishment list response."""
    items: list[EstablishmentResponse]
    total: int
    page: int
    page_size: int


# ─── Helpers ───────────────────────────────────────────────────────────────────


async def generate_unique_slug(db: DBSession, name: str) -> str:
    """Generate unique slug from name."""
    base_slug = slugify(name, max_length=50)
    slug = base_slug
    counter = 1
    
    while True:
        result = await db.execute(
            select(Establishment).where(Establishment.slug == slug)
        )
        if not result.scalar_one_or_none():
            return slug
        slug = f"{base_slug}-{counter}"
        counter += 1


def establishment_to_response(est: Establishment) -> EstablishmentResponse:
    """Convert establishment to response."""
    return EstablishmentResponse(
        id=str(est.id),
        name=est.name,
        slug=est.slug,
        category=est.category.value,
        description=est.description,
        address=est.address,
        city=est.city,
        state=est.state,
        zip_code=est.zip_code,
        phone=est.phone,
        whatsapp=est.whatsapp,
        logo_url=est.logo_url,
        cover_url=est.cover_url,
        business_hours=est.business_hours,
        queue_mode_enabled=est.queue_mode_enabled,
        status=est.status.value,
        subscription_tier=est.subscription_tier.value,
    )


# ─── Endpoints ─────────────────────────────────────────────────────────────────


@router.post("", response_model=EstablishmentResponse, status_code=201)
async def create_establishment(
    request: EstablishmentCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> EstablishmentResponse:
    """Create new establishment."""
    # Generate unique slug
    slug = await generate_unique_slug(db, request.name)
    
    establishment = Establishment(
        owner_id=current_user.id,
        name=request.name,
        slug=slug,
        category=request.category,
        description=request.description,
        address=request.address,
        city=request.city,
        state=request.state,
        zip_code=request.zip_code,
        phone=request.phone,
        whatsapp=request.whatsapp,
        status=EstablishmentStatus.PENDING,
        subscription_tier=SubscriptionTier.TRIAL,
    )
    
    # Upgrade user to owner if needed
    if current_user.role == UserRole.CUSTOMER:
        current_user.role = UserRole.OWNER
    
    db.add(establishment)
    await db.commit()
    await db.refresh(establishment)
    
    return establishment_to_response(establishment)


@router.get("", response_model=EstablishmentListResponse)
async def list_establishments(
    db: DBSession,
    city: str | None = Query(None),
    category: EstablishmentCategory | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> EstablishmentListResponse:
    """List establishments with filtering."""
    query = select(Establishment).where(
        Establishment.status == EstablishmentStatus.ACTIVE
    )
    
    if city:
        query = query.where(Establishment.city.ilike(f"%{city}%"))
    if category:
        query = query.where(Establishment.category == category)
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Paginate
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    establishments = result.scalars().all()
    
    return EstablishmentListResponse(
        items=[establishment_to_response(e) for e in establishments],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/my", response_model=list[EstablishmentResponse])
async def list_my_establishments(
    db: DBSession,
    current_user: CurrentUser,
) -> list[EstablishmentResponse]:
    """List current user's establishments."""
    result = await db.execute(
        select(Establishment).where(Establishment.owner_id == current_user.id)
    )
    establishments = result.scalars().all()
    return [establishment_to_response(e) for e in establishments]


@router.get("/{establishment_id}", response_model=EstablishmentResponse)
async def get_establishment(
    establishment_id: UUID,
    db: DBSession,
) -> EstablishmentResponse:
    """Get establishment by ID."""
    result = await db.execute(
        select(Establishment).where(Establishment.id == establishment_id)
    )
    establishment = result.scalar_one_or_none()
    
    if not establishment:
        raise NotFoundError("Estabelecimento")
    
    return establishment_to_response(establishment)


@router.get("/slug/{slug}", response_model=EstablishmentResponse)
async def get_establishment_by_slug(
    slug: str,
    db: DBSession,
) -> EstablishmentResponse:
    """Get establishment by slug."""
    result = await db.execute(
        select(Establishment).where(Establishment.slug == slug)
    )
    establishment = result.scalar_one_or_none()
    
    if not establishment:
        raise NotFoundError("Estabelecimento")
    
    return establishment_to_response(establishment)


@router.patch("/{establishment_id}", response_model=EstablishmentResponse)
async def update_establishment(
    establishment_id: UUID,
    request: EstablishmentUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> EstablishmentResponse:
    """Update establishment."""
    result = await db.execute(
        select(Establishment).where(Establishment.id == establishment_id)
    )
    establishment = result.scalar_one_or_none()
    
    if not establishment:
        raise NotFoundError("Estabelecimento")
    
    # Check ownership
    if establishment.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise ForbiddenError()
    
    # Update fields
    for field, value in request.model_dump(exclude_unset=True).items():
        setattr(establishment, field, value)
    
    await db.commit()
    await db.refresh(establishment)
    
    return establishment_to_response(establishment)


@router.delete("/{establishment_id}", status_code=204)
async def delete_establishment(
    establishment_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> None:
    """Delete establishment (soft delete - changes status to CLOSED)."""
    result = await db.execute(
        select(Establishment).where(Establishment.id == establishment_id)
    )
    establishment = result.scalar_one_or_none()
    
    if not establishment:
        raise NotFoundError("Estabelecimento")
    
    # Check ownership
    if establishment.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise ForbiddenError()
    
    establishment.status = EstablishmentStatus.CLOSED
    await db.commit()
