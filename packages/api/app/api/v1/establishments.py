"""Establishment endpoints."""

from uuid import UUID

from fastapi import APIRouter, Query
from pydantic import BaseModel, ConfigDict, Field
from slugify import slugify
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DBSession
from app.core.exceptions import ForbiddenError, NotFoundError
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
    business_hours: dict | None = Field(default_factory=dict)
    cancellation_fee_fixed: float | None = Field(0.0, ge=0)
    no_show_fee_percent: float | None = Field(0.0, ge=0, le=100)
    deposit_percent: float | None = Field(0.0, ge=0, le=100)


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
    latitude: float | None = None
    longitude: float | None = None
    status: EstablishmentStatus | None = None
    logo_url: str | None = Field(None, max_length=500)
    cover_url: str | None = Field(None, max_length=500)
    business_hours: dict | None = None
    queue_mode_enabled: bool | None = None
    cancellation_fee_fixed: float | None = None
    no_show_fee_percent: float | None = None
    deposit_percent: float | None = None


class EstablishmentResponse(BaseModel):
    """Establishment response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    slug: str
    category: str
    description: str | None
    address: str
    city: str
    state: str
    zip_code: str | None
    latitude: float | None
    longitude: float | None
    phone: str
    whatsapp: str | None
    logo_url: str | None
    cover_url: str | None
    business_hours: dict
    distance: float | None = None
    queue_mode_enabled: bool
    status: str
    subscription_tier: str
    cancellation_fee_fixed: float
    no_show_fee_percent: float
    deposit_percent: float


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
        result = await db.execute(select(Establishment).where(Establishment.slug == slug))
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
        latitude=float(est.latitude) if est.latitude is not None else None,
        longitude=float(est.longitude) if est.longitude is not None else None,
        phone=est.phone,
        whatsapp=est.whatsapp,
        logo_url=est.logo_url,
        cover_url=est.cover_url,
        business_hours=est.business_hours,
        distance=getattr(est, "distance", None),
        queue_mode_enabled=est.queue_mode_enabled,
        status=est.status.value,
        subscription_tier=est.subscription_tier.value,
        cancellation_fee_fixed=float(est.cancellation_fee_fixed),
        no_show_fee_percent=float(est.no_show_fee_percent),
        deposit_percent=float(est.deposit_percent),
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
        business_hours=request.business_hours or {},
        cancellation_fee_fixed=request.cancellation_fee_fixed or 0.0,
        no_show_fee_percent=request.no_show_fee_percent or 0.0,
        deposit_percent=request.deposit_percent or 0.0,
        status=EstablishmentStatus.pending,
        subscription_tier=SubscriptionTier.trial,
    )

    # Upgrade user to owner if needed
    if current_user.role == UserRole.customer:
        current_user.role = UserRole.owner

    db.add(establishment)
    await db.commit()
    await db.refresh(establishment)

    return establishment_to_response(establishment)


@router.get("", response_model=EstablishmentListResponse)
async def list_establishments(
    db: DBSession,
    city: str | None = Query(None),
    category: EstablishmentCategory | None = Query(None),
    lat: float | None = Query(None, ge=-90, le=90),
    lng: float | None = Query(None, ge=-180, le=180),
    radius: float | None = Query(None, gt=0, doc="Radius in km"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> EstablishmentListResponse:
    """List establishments with filtering and optional geo-search."""
    query = select(Establishment).where(Establishment.status == EstablishmentStatus.active)

    # ─── Geo Search (Haversine) ────────────────────────────────────────────────
    distance_col = None
    if lat is not None and lng is not None:
        # Haversine formula in SQL
        # 6371 is Earth's radius in kilometers
        # We use radians for calculations

        # d = 6371 * acos(cos(lat1)*cos(lat2)*cos(lon2-lon1) + sin(lat1)*sin(lat2))
        # Note: postgres uses radians in trigonometric functions

        lat_rad = func.radians(lat)
        lng_rad = func.radians(lng)
        est_lat_rad = func.radians(Establishment.latitude)
        est_lng_rad = func.radians(Establishment.longitude)

        distance_expression = 6371 * func.acos(
            func.cos(lat_rad) * func.cos(est_lat_rad) * func.cos(est_lng_rad - lng_rad)
            + func.sin(lat_rad) * func.sin(est_lat_rad)
        )

        # Label the distance for access and sorting
        distance_col = distance_expression.label("distance")

        # Add to query
        query = query.add_columns(distance_col)

        if radius:
            query = query.where(distance_expression <= radius)

        # Default sort by distance when coordinates are provided
        query = query.order_by(distance_col.asc())

    # ─── Other Filters ─────────────────────────────────────────────────────────
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

    establishments = []
    if distance_col is not None:
        # result.scalars() won't work easily with extra columns
        for row in result:
            est = row[0]
            est.distance = row[1]  # Inject distance for helper
            establishments.append(est)
    else:
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
    result = await db.execute(select(Establishment).where(Establishment.id == establishment_id))
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
    result = await db.execute(select(Establishment).where(Establishment.slug == slug))
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
    result = await db.execute(select(Establishment).where(Establishment.id == establishment_id))
    establishment = result.scalar_one_or_none()

    if not establishment:
        raise NotFoundError("Estabelecimento")

    # Check ownership
    if establishment.owner_id != current_user.id and current_user.role != UserRole.admin:
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
    result = await db.execute(select(Establishment).where(Establishment.id == establishment_id))
    establishment = result.scalar_one_or_none()

    if not establishment:
        raise NotFoundError("Estabelecimento")

    # Check ownership
    if establishment.owner_id != current_user.id and current_user.role != UserRole.admin:
        raise ForbiddenError()

    establishment.status = EstablishmentStatus.closed
    await db.commit()
