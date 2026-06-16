"""Supplier order endpoints — B2B order management."""

from uuid import UUID

from fastapi import APIRouter, Query, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.exceptions import ForbiddenError, NotFoundError
from app.models import UserRole
from app.models.establishment import Establishment
from app.models.supplier import Supplier, SupplierOrderStatus
from app.schemas.supplier import (
    SupplierOrderCreate,
    SupplierOrderListResponse,
    SupplierOrderResponse,
    SupplierOrderStatusUpdate,
)
from app.services.supplier_order_service import SupplierOrderService

router = APIRouter(prefix="/supplier-orders", tags=["Supplier Orders"])


async def _get_my_establishment(db: DBSession, current_user: CurrentUser) -> Establishment:
    result = await db.execute(
        select(Establishment).where(Establishment.owner_id == current_user.id).limit(1)
    )
    est = result.scalar_one_or_none()
    if not est:
        raise ForbiddenError("Apenas donos de estabelecimento podem fazer pedidos")
    return est


async def _get_my_supplier(db: DBSession, current_user: CurrentUser) -> Supplier:
    result = await db.execute(
        select(Supplier).where(Supplier.owner_user_id == current_user.id)
    )
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise ForbiddenError("Perfil de fornecedor não encontrado")
    return supplier


@router.post("", response_model=SupplierOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    data: SupplierOrderCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> SupplierOrderResponse:
    """Place a B2B order (establishment owner)."""
    establishment = await _get_my_establishment(db, current_user)
    service = SupplierOrderService(db)
    order = await service.create(establishment.id, data)
    return _enrich_order(order)


@router.get("", response_model=SupplierOrderListResponse)
async def list_my_orders(
    db: DBSession,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
) -> SupplierOrderListResponse:
    """List orders.

    - Establishment owners see their own orders.
    - Supplier owners see orders sent to their supplier.
    - Admins see all (not implemented; use admin routes).
    """
    service = SupplierOrderService(db)

    # Check if current user is a supplier owner
    supplier_result = await db.execute(
        select(Supplier).where(Supplier.owner_user_id == current_user.id)
    )
    supplier = supplier_result.scalar_one_or_none()

    if supplier and current_user.role not in (UserRole.owner, UserRole.admin):
        # Pure supplier user — show orders for their supplier
        orders, total = await service.list_for_supplier(
            supplier.id, page=page, page_size=page_size
        )
    else:
        # Establishment owner (may also be a supplier — defaults to buyer view)
        establishment_result = await db.execute(
            select(Establishment).where(Establishment.owner_id == current_user.id).limit(1)
        )
        est = establishment_result.scalar_one_or_none()
        if not est:
            return SupplierOrderListResponse(items=[], total=0, page=page, page_size=page_size)
        orders, total = await service.list_for_establishment(
            est.id, page=page, page_size=page_size
        )

    return SupplierOrderListResponse(
        items=[_enrich_order(o) for o in orders],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/incoming", response_model=SupplierOrderListResponse)
async def list_incoming_orders(
    db: DBSession,
    current_user: CurrentUser,
    status_filter: SupplierOrderStatus | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
) -> SupplierOrderListResponse:
    """List orders received by the current user's supplier profile."""
    supplier = await _get_my_supplier(db, current_user)
    service = SupplierOrderService(db)
    orders, total = await service.list_for_supplier(
        supplier.id, status=status_filter, page=page, page_size=page_size
    )
    return SupplierOrderListResponse(
        items=[_enrich_order(o) for o in orders],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{order_id}", response_model=SupplierOrderResponse)
async def get_order(
    order_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> SupplierOrderResponse:
    """Get order detail (buyer or supplier owner)."""
    service = SupplierOrderService(db)
    order = await service.get(order_id)
    if not order:
        raise NotFoundError("Pedido")
    _check_order_access(order, current_user)
    return _enrich_order(order)


@router.patch("/{order_id}/status", response_model=SupplierOrderResponse)
async def update_order_status(
    order_id: UUID,
    data: SupplierOrderStatusUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> SupplierOrderResponse:
    """Update order status (supplier owner/admin only)."""
    supplier = await _get_my_supplier(db, current_user)
    service = SupplierOrderService(db)
    order = await service.update_status(order_id, data, supplier.id)
    if not order:
        raise NotFoundError("Pedido")
    full_order = await service.get(order.id)
    return _enrich_order(full_order)  # type: ignore[arg-type]


# ─── Helpers ──────────────────────────────────────────────────────────────────


def _check_order_access(order, current_user: CurrentUser) -> None:
    """Allow access to buyer (establishment owner) or supplier owner or admin."""
    if current_user.role == UserRole.admin:
        return
    if order.establishment and order.establishment.owner_id == current_user.id:
        return
    if order.supplier and order.supplier.owner_user_id == current_user.id:
        return
    raise ForbiddenError()


def _enrich_order(order) -> SupplierOrderResponse:
    resp = SupplierOrderResponse.model_validate(order)
    if order.supplier:
        resp.supplier_name = order.supplier.name
    if order.establishment:
        resp.establishment_name = order.establishment.name
    if order.items:
        for item_resp, item in zip(resp.items, order.items, strict=False):
            if item.product:
                item_resp.product_name = item.product.name
    return resp
