"""Product endpoints."""

from uuid import UUID

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.exceptions import ForbiddenError, NotFoundError
from app.models import Establishment, Product, UserRole
from app.schemas.product import ProductCreate, ProductResponse, ProductUpdate

router = APIRouter(prefix="/establishments/{establishment_id}/products", tags=["Products"])


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


@router.get("", response_model=list[ProductResponse])
async def list_products(
    establishment_id: UUID,
    db: DBSession,
    active_only: bool = True,
) -> list[ProductResponse]:
    """List products for an establishment."""
    query = select(Product).where(Product.establishment_id == establishment_id)

    if active_only:
        query = query.where(Product.active == True)

    result = await db.execute(query)
    products = result.scalars().all()

    return [ProductResponse.model_validate(p) for p in products]


@router.post("", response_model=ProductResponse, status_code=201)
async def create_product(
    establishment_id: UUID,
    request: ProductCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> ProductResponse:
    """Create new product."""
    establishment = await get_establishment_or_404(db, establishment_id)
    check_ownership(establishment, current_user)

    product = Product(establishment_id=establishment_id, **request.model_dump())

    db.add(product)
    await db.commit()
    await db.refresh(product)

    return ProductResponse.model_validate(product)


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    establishment_id: UUID,
    product_id: UUID,
    db: DBSession,
) -> ProductResponse:
    """Get product by ID."""
    result = await db.execute(
        select(Product).where(
            Product.id == product_id, Product.establishment_id == establishment_id
        )
    )
    product = result.scalar_one_or_none()

    if not product:
        raise NotFoundError("Produto")

    return ProductResponse.model_validate(product)


@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(
    establishment_id: UUID,
    product_id: UUID,
    request: ProductUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> ProductResponse:
    """Update product."""
    establishment = await get_establishment_or_404(db, establishment_id)
    check_ownership(establishment, current_user)

    result = await db.execute(
        select(Product).where(
            Product.id == product_id, Product.establishment_id == establishment_id
        )
    )
    product = result.scalar_one_or_none()

    if not product:
        raise NotFoundError("Produto")

    for field, value in request.model_dump(exclude_unset=True).items():
        setattr(product, field, value)

    await db.commit()
    await db.refresh(product)

    return ProductResponse.model_validate(product)


@router.delete("/{product_id}", status_code=204)
async def delete_product(
    establishment_id: UUID,
    product_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> None:
    """Delete product (soft delete)."""
    establishment = await get_establishment_or_404(db, establishment_id)
    check_ownership(establishment, current_user)

    result = await db.execute(
        select(Product).where(
            Product.id == product_id, Product.establishment_id == establishment_id
        )
    )
    product = result.scalar_one_or_none()

    if not product:
        raise NotFoundError("Produto")

    product.active = False
    await db.commit()
