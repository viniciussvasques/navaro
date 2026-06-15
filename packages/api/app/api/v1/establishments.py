"""Establishment endpoints."""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, ConfigDict, Field
from slugify import slugify
from sqlalchemy import case, func, or_, select

from app.api.deps import CurrentUser, DBSession, OptionalUser
from app.core.exceptions import ForbiddenError, NotFoundError
from app.models import (
    Establishment,
    EstablishmentCategory,
    EstablishmentStatus,
    SubscriptionTier,
    UserRole,
)
from app.models.portfolio import SearchHistory
from app.models.review import Review
from app.models.service import Service
from app.schemas.establishment import TimeSlot
from app.services.appointment_service import AppointmentService
from app.services.storage_service import StorageService

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
    latitude: float | None = None
    longitude: float | None = None


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
    accept_online_payment: bool | None = None
    accept_cash_payment: bool | None = None
    # Bank/PIX
    pix_key: str | None = None
    pix_key_type: str | None = None
    bank_name: str | None = None
    bank_agency: str | None = None
    bank_account: str | None = None
    bank_account_type: str | None = None
    bank_holder_name: str | None = None
    bank_holder_document: str | None = None
    auto_payout_enabled: bool | None = None
    cancellation_fee_fixed: float | None = None
    no_show_fee_percent: float | None = None
    deposit_percent: float | None = None
    subscription_tier: SubscriptionTier | None = None
    is_sponsored: bool | None = None
    sponsored_until: datetime | None = None


class EstablishmentResponse(BaseModel):
    """Establishment response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    owner_id: str
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
    accept_online_payment: bool
    accept_cash_payment: bool
    pix_key: str | None = None
    pix_key_type: str | None = None
    bank_name: str | None = None
    bank_agency: str | None = None
    bank_account: str | None = None
    bank_account_type: str | None = None
    bank_holder_name: str | None = None
    bank_holder_document: str | None = None
    auto_payout_enabled: bool = False
    status: str
    subscription_tier: str
    cancellation_fee_fixed: float
    no_show_fee_percent: float
    deposit_percent: float
    is_sponsored: bool
    created_at: datetime
    updated_at: datetime


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


def establishment_to_response(
    est: Establishment,
    *,
    is_sponsored: bool | None = None,
) -> EstablishmentResponse:
    """Convert establishment to response."""
    sponsored = is_sponsored if is_sponsored is not None else est.is_sponsored
    return EstablishmentResponse(
        id=str(est.id),
        owner_id=str(est.owner_id),
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
        accept_online_payment=est.accept_online_payment,
        accept_cash_payment=est.accept_cash_payment,
        pix_key=est.pix_key,
        pix_key_type=est.pix_key_type,
        bank_name=est.bank_name,
        bank_agency=est.bank_agency,
        bank_account=est.bank_account,
        bank_account_type=est.bank_account_type,
        bank_holder_name=est.bank_holder_name,
        bank_holder_document=est.bank_holder_document,
        auto_payout_enabled=est.auto_payout_enabled,
        status=est.status.value,
        subscription_tier=est.subscription_tier.value,
        cancellation_fee_fixed=float(est.cancellation_fee_fixed),
        no_show_fee_percent=float(est.no_show_fee_percent),
        deposit_percent=float(est.deposit_percent),
        is_sponsored=sponsored,
        created_at=est.created_at,
        updated_at=est.updated_at,
    )


# ─── Endpoints ─────────────────────────────────────────────────────────────────


@router.post("", response_model=EstablishmentResponse, status_code=201)
async def create_establishment(
    request: EstablishmentCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> EstablishmentResponse:
    """Create new establishment."""
    from datetime import UTC, datetime, timedelta

    from app.services.monetization_service import MonetizationService

    slug = await generate_unique_slug(db, request.name)
    mon_svc = MonetizationService(db)
    trial_days = await mon_svc.get_trial_days()
    trial_expires = datetime.now(UTC) + timedelta(days=trial_days)

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
        latitude=request.latitude,
        longitude=request.longitude,
        status=EstablishmentStatus.pending,
        subscription_tier=SubscriptionTier.trial,
        platform_subscription_expires_at=trial_expires,
    )

    # Upgrade user to owner if needed
    if current_user.role == UserRole.customer:
        current_user.role = UserRole.owner

    db.add(establishment)
    await db.commit()
    await db.refresh(establishment)

    # Enviar mensagem de boas-vindas via WhatsApp
    try:
        from app.services.whatsapp_service import get_whatsapp_service

        wa = get_whatsapp_service()
        phone_to = (request.whatsapp or request.phone or current_user.phone).strip()
        if phone_to:
            await wa.send_welcome_establishment(
                phone_to,
                current_user.name,
                establishment.name,
            )
    except Exception as e:
        from app.core.logging import get_logger

        get_logger(__name__).warning("Failed to send welcome WhatsApp", error=str(e))

    return establishment_to_response(establishment)


@router.get("", response_model=EstablishmentListResponse)
async def list_establishments(
    db: DBSession,
    current_user: OptionalUser = None,
    q: str | None = Query(None, min_length=1, description="Busca por nome ou cidade"),
    city: str | None = Query(None),
    category: EstablishmentCategory | None = Query(None),
    min_rating: float | None = Query(None, ge=1, le=5),
    max_price: float | None = Query(None, gt=0, description="Preço máximo do serviço mais barato"),
    lat: float | None = Query(None, ge=-90, le=90),
    lng: float | None = Query(None, ge=-180, le=180),
    radius: float | None = Query(None, gt=0, doc="Radius in km"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> EstablishmentListResponse:
    """List establishments with filtering and optional geo-search."""
    if q and current_user:
        db.add(
            SearchHistory(
                user_id=current_user.id,
                query=q.strip(),
            )
        )
        await db.flush()

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

        distance_col = distance_expression.label("distance")
        query = query.add_columns(distance_col)

        if radius:
            query = query.where(distance_expression <= radius)

    # ─── Ordering Logic ───────────────────────────────────────────────────────
    # We want to limit the "Sponsored Boost" to the TOP 4 sponsored establishments.
    # To do this cleanly in SQLAlchemy with pagination, we use a window function.

    sponsored_rank = func.row_number().over(
        partition_by=Establishment.is_sponsored,
        order_by=[
            case(
                (Establishment.subscription_tier == "platinum", 5),
                (Establishment.subscription_tier == "gold", 4),
                (Establishment.subscription_tier == "silver", 3),
                (Establishment.subscription_tier == "bronze", 2),
                (Establishment.subscription_tier == "free", 1),
                else_=0,
            ).desc(),
            Establishment.name.asc(),
        ],
    )

    # If geo searching, distance is the third tie-breaker for sponsored rank
    if distance_col is not None:
        sponsored_rank = func.row_number().over(
            partition_by=Establishment.is_sponsored,
            order_by=[
                case(
                    (Establishment.subscription_tier == "platinum", 5),
                    (Establishment.subscription_tier == "gold", 4),
                    (Establishment.subscription_tier == "silver", 3),
                    (Establishment.subscription_tier == "bronze", 2),
                    (Establishment.subscription_tier == "free", 1),
                    else_=0,
                ).desc(),
                distance_col.asc(),
                Establishment.name.asc(),
            ],
        )

    # A "Prime Sponsored" is someone who is_sponsored=True AND is within the top 4
    is_prime_sponsored = case(
        ((Establishment.is_sponsored == True) & (sponsored_rank <= 4), 1), else_=0
    )

    tier_priority = case(
        (Establishment.subscription_tier == "platinum", 5),
        (Establishment.subscription_tier == "gold", 4),
        (Establishment.subscription_tier == "silver", 3),
        (Establishment.subscription_tier == "bronze", 2),
        (Establishment.subscription_tier == "free", 1),
        else_=0,
    )

    if distance_col is not None:
        query = query.order_by(is_prime_sponsored.desc(), tier_priority.desc(), distance_col.asc())
    else:
        query = query.order_by(
            is_prime_sponsored.desc(), tier_priority.desc(), Establishment.name.asc()
        )

    # ─── Other Filters ─────────────────────────────────────────────────────────
    if q:
        term = f"%{q.strip()}%"
        query = query.where(
            or_(
                Establishment.name.ilike(term),
                Establishment.city.ilike(term),
                Establishment.address.ilike(term),
            )
        )
    if city:
        query = query.where(Establishment.city.ilike(f"%{city}%"))
    if category:
        query = query.where(Establishment.category == category)
    if min_rating is not None:
        rating_subq = (
            select(
                Review.establishment_id.label("est_id"),
                func.avg(Review.rating).label("avg_rating"),
            )
            .group_by(Review.establishment_id)
            .subquery()
        )
        query = query.join(rating_subq, Establishment.id == rating_subq.c.est_id).where(
            rating_subq.c.avg_rating >= min_rating
        )
    if max_price is not None:
        price_subq = (
            select(
                Service.establishment_id.label("est_id"),
                func.min(Service.price).label("min_price"),
            )
            .where(Service.active == True)
            .group_by(Service.establishment_id)
            .subquery()
        )
        query = query.join(price_subq, Establishment.id == price_subq.c.est_id).where(
            price_subq.c.min_price <= max_price
        )

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

    if q and current_user:
        await db.commit()

    from app.services.promotion_service import AdCampaignService

    ad_svc = AdCampaignService(db)
    user_city = city or (current_user and getattr(current_user, "city", None))
    sponsored_flags: dict = {}
    for est in establishments:
        if est.is_sponsored:
            camp = await ad_svc.get_active_campaign(
                est.id,
                user_lat=lat,
                user_lng=lng,
                user_city=user_city or est.city,
            )
            sponsored_flags[est.id] = camp is not None
            if camp:
                await ad_svc.record_impression(
                    est.id,
                    user_lat=lat,
                    user_lng=lng,
                    user_city=user_city or est.city,
                    commit=False,
                )
        else:
            sponsored_flags[est.id] = False
    if any(sponsored_flags.values()):
        await db.commit()

    return EstablishmentListResponse(
        items=[
            establishment_to_response(
                e,
                is_sponsored=sponsored_flags.get(e.id, e.is_sponsored),
            )
            for e in establishments
        ],
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
    lat: float | None = Query(None),
    lng: float | None = Query(None),
    city: str | None = Query(None),
    track_click: bool = Query(False, description="Register ad click if sponsored"),
) -> EstablishmentResponse:
    """Get establishment by ID."""
    result = await db.execute(select(Establishment).where(Establishment.id == establishment_id))
    establishment = result.scalar_one_or_none()

    if not establishment:
        raise NotFoundError("Estabelecimento")

    if track_click and establishment.is_sponsored:
        from app.services.promotion_service import AdCampaignService

        await AdCampaignService(db).record_click(
            establishment_id,
            user_lat=lat,
            user_lng=lng,
            user_city=city or establishment.city,
        )

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


# ─── Media Upload (Logo / Capa) ────────────────────────────────────────────────


async def _get_storage_or_503(db: DBSession) -> StorageService:
    """Helper to criar StorageService ou devolver 503 claro."""
    return await StorageService.from_db(db)


@router.post(
    "/{establishment_id}/logo",
    response_model=EstablishmentResponse,
    status_code=status.HTTP_200_OK,
)
async def upload_establishment_logo(
    establishment_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
    file: UploadFile = File(...),
) -> EstablishmentResponse:
    """Upload da logo do estabelecimento para o storage configurado (S3/R2).

    - Requer que o usuário seja dono do estabelecimento ou admin.
    - Atualiza `logo_url` com a URL pública retornada pelo storage.
    """
    result = await db.execute(select(Establishment).where(Establishment.id == establishment_id))
    establishment = result.scalar_one_or_none()
    if not establishment:
        raise NotFoundError("Estabelecimento")

    if establishment.owner_id != current_user.id and current_user.role != UserRole.admin:
        raise ForbiddenError()

    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Arquivo vazio.")

    storage = await _get_storage_or_503(db)
    url = await storage.upload_establishment_logo(
        establishment_id=establishment_id,
        content=content,
        content_type=file.content_type or "image/jpeg",
    )

    establishment.logo_url = url
    await db.commit()
    await db.refresh(establishment)
    return establishment_to_response(establishment)


@router.post(
    "/{establishment_id}/cover",
    response_model=EstablishmentResponse,
    status_code=status.HTTP_200_OK,
)
async def upload_establishment_cover(
    establishment_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
    file: UploadFile = File(...),
) -> EstablishmentResponse:
    """Upload da foto de capa do estabelecimento para o storage configurado (S3/R2)."""
    result = await db.execute(select(Establishment).where(Establishment.id == establishment_id))
    establishment = result.scalar_one_or_none()
    if not establishment:
        raise NotFoundError("Estabelecimento")

    if establishment.owner_id != current_user.id and current_user.role != UserRole.admin:
        raise ForbiddenError()

    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Arquivo vazio.")

    storage = await _get_storage_or_503(db)
    url = await storage.upload_establishment_cover(
        establishment_id=establishment_id,
        content=content,
        content_type=file.content_type or "image/jpeg",
    )

    establishment.cover_url = url
    await db.commit()
    await db.refresh(establishment)
    return establishment_to_response(establishment)
@router.get("/{establishment_id}/slots", response_model=list[TimeSlot])
async def get_establishment_slots(
    establishment_id: UUID,
    db: DBSession,
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    staff_id: UUID | None = None,
):
    """Get available slots for establishment."""
    # check if establishment exists
    result = await db.execute(select(Establishment).where(Establishment.id == establishment_id))
    if not result.scalar_one_or_none():
        raise NotFoundError("Estabelecimento")

    service = AppointmentService(db)
    return await service.get_available_slots(establishment_id, date, staff_id)
