"""Supplier endpoints — B2B marketplace."""

from uuid import UUID

from fastapi import APIRouter, Query, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.exceptions import ForbiddenError, NotFoundError
from app.models import UserRole
from app.models.establishment import Establishment
from app.models.supplier import Supplier
from app.schemas.supplier import (
    SupplierCreate,
    SupplierListResponse,
    SupplierProductCreate,
    SupplierProductResponse,
    SupplierProductUpdate,
    SupplierPromotionCreate,
    SupplierPromotionResponse,
    SupplierPromotionUpdate,
    SupplierResponse,
    SupplierReviewCreate,
    SupplierReviewRespond,
    SupplierReviewResponse,
    SupplierStockResponse,
    SupplierStockUpdate,
    SupplierUpdate,
)
from app.services.supplier_service import SupplierService

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])


# ─── Helpers ───────────────────────────────────────────────────────────────────


async def _get_supplier_or_404(db: DBSession, supplier_id: UUID) -> Supplier:
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise NotFoundError("Fornecedor")
    return supplier


def _check_supplier_ownership(supplier: Supplier, current_user: CurrentUser) -> None:
    if supplier.owner_user_id != current_user.id and current_user.role != UserRole.admin:
        raise ForbiddenError()


async def _get_my_establishment(db: DBSession, current_user: CurrentUser) -> Establishment | None:
    """Get the first active establishment for the current owner."""
    result = await db.execute(
        select(Establishment).where(Establishment.owner_id == current_user.id).limit(1)
    )
    return result.scalar_one_or_none()


# ─── Public / Discovery ────────────────────────────────────────────────────────


@router.get("", response_model=SupplierListResponse)
async def list_suppliers(
    db: DBSession,
    segment: str | None = Query(None),
    city: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> SupplierListResponse:
    """List active suppliers (public discovery for establishments)."""
    service = SupplierService(db)
    items, total = await service.list(
        segment=segment, city=city, active_only=True, page=page, page_size=page_size
    )
    return SupplierListResponse(
        items=[SupplierResponse.model_validate(s) for s in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/my", response_model=SupplierResponse)
async def get_my_supplier(db: DBSession, current_user: CurrentUser) -> SupplierResponse:
    """Get the supplier profile owned by the current user."""
    service = SupplierService(db)
    supplier = await service.get_by_owner(current_user.id)
    if not supplier:
        raise NotFoundError("Perfil de fornecedor")
    return SupplierResponse.model_validate(supplier)


@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    data: SupplierCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> SupplierResponse:
    """Register as a supplier (any authenticated user)."""
    service = SupplierService(db)
    existing = await service.get_by_owner(current_user.id)
    if existing:
        from app.core.exceptions import AlreadyExistsError
        raise AlreadyExistsError("Perfil de fornecedor")
    supplier = await service.create(current_user.id, data)
    return SupplierResponse.model_validate(supplier)


@router.get("/{supplier_id}", response_model=SupplierResponse)
async def get_supplier(supplier_id: UUID, db: DBSession) -> SupplierResponse:
    """Get supplier by ID (public)."""
    supplier = await _get_supplier_or_404(db, supplier_id)
    return SupplierResponse.model_validate(supplier)


@router.patch("/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: UUID,
    data: SupplierUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> SupplierResponse:
    """Update supplier profile (owner/admin)."""
    supplier = await _get_supplier_or_404(db, supplier_id)
    _check_supplier_ownership(supplier, current_user)
    service = SupplierService(db)
    updated = await service.update(supplier_id, data)
    if not updated:
        raise NotFoundError("Fornecedor")
    return SupplierResponse.model_validate(updated)


# ─── Products ─────────────────────────────────────────────────────────────────


@router.get("/{supplier_id}/products", response_model=list[SupplierProductResponse])
async def list_products(
    supplier_id: UUID,
    db: DBSession,
    active_only: bool = Query(True),
) -> list[SupplierProductResponse]:
    """List supplier products."""
    await _get_supplier_or_404(db, supplier_id)
    service = SupplierService(db)
    products = await service.list_products(supplier_id, active_only=active_only)
    return [_enrich_product(p) for p in products]


@router.post(
    "/{supplier_id}/products",
    response_model=SupplierProductResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_product(
    supplier_id: UUID,
    data: SupplierProductCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> SupplierProductResponse:
    """Add product to supplier catalog (owner/admin)."""
    supplier = await _get_supplier_or_404(db, supplier_id)
    _check_supplier_ownership(supplier, current_user)
    service = SupplierService(db)
    product = await service.create_product(supplier_id, data)
    return _enrich_product(product)


@router.patch("/{supplier_id}/products/{product_id}", response_model=SupplierProductResponse)
async def update_product(
    supplier_id: UUID,
    product_id: UUID,
    data: SupplierProductUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> SupplierProductResponse:
    """Update supplier product (owner/admin)."""
    supplier = await _get_supplier_or_404(db, supplier_id)
    _check_supplier_ownership(supplier, current_user)
    service = SupplierService(db)
    product = await service.update_product(product_id, data)
    if not product or product.supplier_id != supplier_id:
        raise NotFoundError("Produto")
    return _enrich_product(product)


@router.delete("/{supplier_id}/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    supplier_id: UUID,
    product_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> None:
    """Remove product from catalog (owner/admin)."""
    supplier = await _get_supplier_or_404(db, supplier_id)
    _check_supplier_ownership(supplier, current_user)
    service = SupplierService(db)
    if not await service.delete_product(product_id):
        raise NotFoundError("Produto")


# ─── Stock ────────────────────────────────────────────────────────────────────


@router.patch(
    "/{supplier_id}/products/{product_id}/stock",
    response_model=SupplierStockResponse,
)
async def update_stock(
    supplier_id: UUID,
    product_id: UUID,
    data: SupplierStockUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> SupplierStockResponse:
    """Update stock for a product (owner/admin)."""
    supplier = await _get_supplier_or_404(db, supplier_id)
    _check_supplier_ownership(supplier, current_user)
    service = SupplierService(db)
    stock = await service.update_stock(product_id, data)
    if not stock:
        raise NotFoundError("Estoque")
    return SupplierStockResponse.model_validate(stock)


@router.get("/{supplier_id}/stock/low", response_model=list[SupplierProductResponse])
async def list_low_stock(
    supplier_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> list[SupplierProductResponse]:
    """List products below minimum stock threshold (owner/admin)."""
    supplier = await _get_supplier_or_404(db, supplier_id)
    _check_supplier_ownership(supplier, current_user)
    service = SupplierService(db)
    products = await service.list_low_stock(supplier_id)
    return [_enrich_product(p) for p in products]


# ─── Promotions ───────────────────────────────────────────────────────────────


@router.get("/{supplier_id}/promotions", response_model=list[SupplierPromotionResponse])
async def list_promotions(
    supplier_id: UUID,
    db: DBSession,
    active_only: bool = Query(False),
) -> list[SupplierPromotionResponse]:
    """List supplier promotions."""
    await _get_supplier_or_404(db, supplier_id)
    service = SupplierService(db)
    promos = await service.list_promotions(supplier_id, active_only=active_only)
    return [SupplierPromotionResponse.model_validate(p) for p in promos]


@router.post(
    "/{supplier_id}/promotions",
    response_model=SupplierPromotionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_promotion(
    supplier_id: UUID,
    data: SupplierPromotionCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> SupplierPromotionResponse:
    """Create supplier promotion (owner/admin)."""
    supplier = await _get_supplier_or_404(db, supplier_id)
    _check_supplier_ownership(supplier, current_user)
    service = SupplierService(db)
    promo = await service.create_promotion(supplier_id, data)
    return SupplierPromotionResponse.model_validate(promo)


@router.patch(
    "/{supplier_id}/promotions/{promotion_id}",
    response_model=SupplierPromotionResponse,
)
async def update_promotion(
    supplier_id: UUID,
    promotion_id: UUID,
    data: SupplierPromotionUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> SupplierPromotionResponse:
    """Update supplier promotion (owner/admin)."""
    supplier = await _get_supplier_or_404(db, supplier_id)
    _check_supplier_ownership(supplier, current_user)
    service = SupplierService(db)
    promo = await service.update_promotion(promotion_id, data)
    if not promo or promo.supplier_id != supplier_id:
        raise NotFoundError("Promoção")
    return SupplierPromotionResponse.model_validate(promo)


# ─── Reviews ──────────────────────────────────────────────────────────────────


@router.get("/{supplier_id}/reviews", response_model=list[SupplierReviewResponse])
async def list_reviews(
    supplier_id: UUID,
    db: DBSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
) -> list[SupplierReviewResponse]:
    """List reviews for a supplier (public)."""
    await _get_supplier_or_404(db, supplier_id)
    service = SupplierService(db)
    reviews, _ = await service.list_reviews(supplier_id, page=page, page_size=page_size)
    return [_enrich_review(r) for r in reviews]


@router.post(
    "/reviews",
    response_model=SupplierReviewResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_review(
    data: SupplierReviewCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> SupplierReviewResponse:
    """Submit a review for a supplier (establishment owner)."""
    establishment = await _get_my_establishment(db, current_user)
    if not establishment:
        raise ForbiddenError("Apenas donos de estabelecimento podem avaliar fornecedores")
    service = SupplierService(db)
    review = await service.create_review(establishment.id, data)
    return _enrich_review(review)


@router.patch(
    "/{supplier_id}/reviews/{review_id}/respond",
    response_model=SupplierReviewResponse,
)
async def respond_to_review(
    supplier_id: UUID,
    review_id: UUID,
    data: SupplierReviewRespond,
    db: DBSession,
    current_user: CurrentUser,
) -> SupplierReviewResponse:
    """Supplier responds to a review (owner/admin)."""
    supplier = await _get_supplier_or_404(db, supplier_id)
    _check_supplier_ownership(supplier, current_user)
    service = SupplierService(db)
    review = await service.respond_review(review_id, data.response)
    if not review or review.supplier_id != supplier_id:
        raise NotFoundError("Avaliação")
    return _enrich_review(review)


# ─── Enrichment helpers ───────────────────────────────────────────────────────


def _enrich_product(product) -> SupplierProductResponse:
    resp = SupplierProductResponse.model_validate(product)
    if product.stock:
        resp.stock_qty = product.stock.quantity
    return resp


def _enrich_review(review) -> SupplierReviewResponse:
    resp = SupplierReviewResponse.model_validate(review)
    if review.establishment:
        resp.establishment_name = review.establishment.name
    return resp
