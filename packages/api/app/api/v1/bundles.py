"""Service Bundle (Combo) endpoints."""

from uuid import UUID

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DBSession
from app.core.exceptions import ForbiddenError, NotFoundError
from app.models import Establishment, Service, ServiceBundle, ServiceBundleItem, UserRole
from app.schemas.service import (
    ServiceBundleCreate,
    ServiceBundleResponse,
    ServiceBundleUpdate,
    ServiceResponse,
)

router = APIRouter(prefix="/establishments/{establishment_id}/bundles", tags=["Service Bundles"])


# ─── Helpers ───────────────────────────────────────────────────────────────────


async def get_establishment_or_404(db: DBSession, establishment_id: UUID) -> Establishment:
    """Get establishment or raise 404."""
    result = await db.execute(select(Establishment).where(Establishment.id == establishment_id))
    establishment = result.scalar_one_or_none()
    if not establishment:
        raise NotFoundError("Estabelecimento")
    return establishment


def check_ownership(establishment: Establishment, user: CurrentUser) -> None:
    """Check if user owns the establishment."""
    if establishment.owner_id != user.id and user.role != UserRole.admin:
        raise ForbiddenError()


# ─── Endpoints ─────────────────────────────────────────────────────────────────


@router.get("", response_model=list[ServiceBundleResponse])
async def list_bundles(
    establishment_id: UUID,
    db: DBSession,
    active_only: bool = True,
) -> list[ServiceBundleResponse]:
    """List bundles for an establishment."""
    query = (
        select(ServiceBundle)
        .where(ServiceBundle.establishment_id == establishment_id)
        .options(selectinload(ServiceBundle.items).selectinload(ServiceBundleItem.service))
    )

    if active_only:
        query = query.where(ServiceBundle.active == True)

    result = await db.execute(query)
    bundles = result.scalars().all()

    return [
        ServiceBundleResponse(
            id=b.id,
            establishment_id=b.establishment_id,
            name=b.name,
            description=b.description,
            original_price=float(b.original_price),
            bundle_price=float(b.bundle_price),
            discount_percent=float(b.discount_percent) if b.discount_percent else None,
            active=b.active,
            services=[ServiceResponse.model_validate(item.service) for item in b.items],
            created_at=b.created_at,
        )
        for b in bundles
    ]


@router.post("", response_model=ServiceBundleResponse, status_code=201)
async def create_bundle(
    establishment_id: UUID,
    request: ServiceBundleCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> ServiceBundleResponse:
    """Create new service bundle."""
    establishment = await get_establishment_or_404(db, establishment_id)
    check_ownership(establishment, current_user)

    # Verify services exist and belong to establishment, calculate original price
    services_result = await db.execute(
        select(Service).where(
            Service.id.in_(request.service_ids), Service.establishment_id == establishment_id
        )
    )
    services = services_result.scalars().all()

    if len(services) != len(request.service_ids):
        raise NotFoundError("Um ou mais serviços não encontrados")

    original_price = sum(float(s.price) for s in services)
    bundle_price = float(request.bundle_price)
    discount_percent = (
        ((original_price - bundle_price) / original_price * 100) if original_price > 0 else 0
    )

    bundle = ServiceBundle(
        establishment_id=establishment_id,
        name=request.name,
        description=request.description,
        original_price=original_price,
        bundle_price=bundle_price,
        discount_percent=discount_percent,
    )

    db.add(bundle)
    await db.flush()  # Get bundle ID

    # Add items
    for service_id in request.service_ids:
        item = ServiceBundleItem(bundle_id=bundle.id, service_id=service_id)
        db.add(item)

    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(ServiceBundle)
        .where(ServiceBundle.id == bundle.id)
        .options(selectinload(ServiceBundle.items).selectinload(ServiceBundleItem.service))
    )
    bundle = result.scalar_one()

    return ServiceBundleResponse(
        id=bundle.id,
        establishment_id=bundle.establishment_id,
        name=bundle.name,
        description=bundle.description,
        original_price=float(bundle.original_price),
        bundle_price=float(bundle.bundle_price),
        discount_percent=float(bundle.discount_percent) if bundle.discount_percent else None,
        active=bundle.active,
        services=[ServiceResponse.model_validate(item.service) for item in bundle.items],
        created_at=bundle.created_at,
    )


@router.patch("/{bundle_id}", response_model=ServiceBundleResponse)
async def update_bundle(
    establishment_id: UUID,
    bundle_id: UUID,
    request: ServiceBundleUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> ServiceBundleResponse:
    """Update service bundle."""
    establishment = await get_establishment_or_404(db, establishment_id)
    check_ownership(establishment, current_user)

    result = await db.execute(
        select(ServiceBundle)
        .where(ServiceBundle.id == bundle_id, ServiceBundle.establishment_id == establishment_id)
        .options(selectinload(ServiceBundle.items).selectinload(ServiceBundleItem.service))
    )
    bundle = result.scalar_one_or_none()

    if not bundle:
        raise NotFoundError("Pacote")

    data = request.model_dump(exclude_unset=True)

    # Handle service items update if requested
    if "service_ids" in data:
        service_ids = data.pop("service_ids")
        # Verify services
        services_result = await db.execute(
            select(Service).where(
                Service.id.in_(service_ids), Service.establishment_id == establishment_id
            )
        )
        services = services_result.scalars().all()
        if len(services) != len(service_ids):
            raise NotFoundError("Um ou mais serviços não encontrados")

        # Clear old items
        await db.execute(
            select(ServiceBundleItem).where(ServiceBundleItem.bundle_id == bundle_id).delete()
        )

        # Add new items
        for sid in service_ids:
            item = ServiceBundleItem(bundle_id=bundle_id, service_id=sid)
            db.add(item)

        # Recalculate original price
        bundle.original_price = sum(float(s.price) for s in services)

    # Update other fields
    for field, value in data.items():
        setattr(bundle, field, value)

    # Recalculate discount if price or services changed
    orig_p = float(bundle.original_price)
    bund_p = float(bundle.bundle_price)
    if orig_p > 0:
        bundle.discount_percent = (orig_p - bund_p) / orig_p * 100

    await db.commit()
    await db.refresh(bundle)

    return ServiceBundleResponse(
        id=bundle.id,
        establishment_id=bundle.establishment_id,
        name=bundle.name,
        description=bundle.description,
        original_price=float(bundle.original_price),
        bundle_price=float(bundle.bundle_price),
        discount_percent=float(bundle.discount_percent) if bundle.discount_percent else None,
        active=bundle.active,
        services=[ServiceResponse.model_validate(item.service) for item in bundle.items],
        created_at=bundle.created_at,
    )


@router.delete("/{bundle_id}", status_code=204)
async def delete_bundle(
    establishment_id: UUID,
    bundle_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> None:
    """Desativar pacote (soft delete)."""
    establishment = await get_establishment_or_404(db, establishment_id)
    check_ownership(establishment, current_user)

    result = await db.execute(
        select(ServiceBundle).where(
            ServiceBundle.id == bundle_id, ServiceBundle.establishment_id == establishment_id
        )
    )
    bundle = result.scalar_one_or_none()

    if not bundle:
        raise NotFoundError("Pacote")

    bundle.active = False
    await db.commit()
