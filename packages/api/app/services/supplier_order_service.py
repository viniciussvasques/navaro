"""Supplier order service — B2B order management."""

from collections.abc import Sequence
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BusinessError, NotFoundError
from app.models.supplier import (
    Supplier,
    SupplierOrder,
    SupplierOrderItem,
    SupplierOrderStatus,
    SupplierProduct,
    SupplierStock,
)
from app.schemas.supplier import OrderItemCreate, SupplierOrderCreate, SupplierOrderStatusUpdate


class SupplierOrderService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get(self, order_id: UUID) -> SupplierOrder | None:
        result = await self.db.execute(
            select(SupplierOrder)
            .where(SupplierOrder.id == order_id)
            .options(
                selectinload(SupplierOrder.items).selectinload(SupplierOrderItem.product),
                selectinload(SupplierOrder.supplier),
                selectinload(SupplierOrder.establishment),
            )
        )
        return result.scalar_one_or_none()

    async def list_for_establishment(
        self,
        establishment_id: UUID,
        *,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[Sequence[SupplierOrder], int]:
        query = select(SupplierOrder).where(SupplierOrder.establishment_id == establishment_id)
        return await self._paginate(query, page, page_size)

    async def list_for_supplier(
        self,
        supplier_id: UUID,
        *,
        status: SupplierOrderStatus | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[Sequence[SupplierOrder], int]:
        query = select(SupplierOrder).where(SupplierOrder.supplier_id == supplier_id)
        if status:
            query = query.where(SupplierOrder.status == status.value)
        return await self._paginate(query, page, page_size)

    async def create(
        self, establishment_id: UUID, data: SupplierOrderCreate
    ) -> SupplierOrder:
        # Validate supplier exists
        supplier = await self.db.get(Supplier, data.supplier_id)
        if not supplier or not supplier.active:
            raise NotFoundError("Fornecedor")

        # Validate products and compute total
        items_data = await self._resolve_items(data.items)

        total = sum(Decimal(str(item["unit_price"])) * item["quantity"] for item in items_data)

        order = SupplierOrder(
            supplier_id=data.supplier_id,
            establishment_id=establishment_id,
            status=SupplierOrderStatus.pending.value,
            total=total,
            notes=data.notes,
        )
        self.db.add(order)
        await self.db.flush()

        for item_data in items_data:
            item = SupplierOrderItem(
                order_id=order.id,
                product_id=item_data["product_id"],
                quantity=item_data["quantity"],
                unit_price=item_data["unit_price"],
                subtotal=Decimal(str(item_data["unit_price"])) * item_data["quantity"],
            )
            self.db.add(item)

        # Update supplier total orders counter
        supplier.total_orders = (supplier.total_orders or 0) + 1

        await self.db.commit()
        await self.db.refresh(order)
        return await self.get(order.id)  # type: ignore[return-value]

    async def update_status(
        self, order_id: UUID, data: SupplierOrderStatusUpdate, supplier_id: UUID
    ) -> SupplierOrder | None:
        result = await self.db.execute(
            select(SupplierOrder).where(
                SupplierOrder.id == order_id,
                SupplierOrder.supplier_id == supplier_id,
            )
        )
        order = result.scalar_one_or_none()
        if not order:
            return None

        self._validate_transition(order.status, data.status)
        order.status = data.status.value
        if data.tracking_code:
            order.tracking_code = data.tracking_code

        await self.db.commit()
        await self.db.refresh(order)
        return order

    async def _resolve_items(
        self, items: list[OrderItemCreate]
    ) -> list[dict]:
        resolved = []
        for item in items:
            result = await self.db.execute(
                select(SupplierProduct)
                .where(SupplierProduct.id == item.product_id, SupplierProduct.active == True)  # noqa: E712
                .options(selectinload(SupplierProduct.stock))
            )
            product = result.scalar_one_or_none()
            if not product:
                raise NotFoundError(f"Produto {item.product_id}")
            if item.quantity < product.moq:
                raise BusinessError(
                    "MOQ_NOT_MET",
                    f"Pedido mínimo para '{product.name}' é {product.moq} {product.unit}",
                )
            if product.stock and product.stock.quantity < item.quantity:
                raise BusinessError(
                    "INSUFFICIENT_STOCK",
                    f"Estoque insuficiente para '{product.name}' (disponível: {product.stock.quantity})",
                )
            resolved.append({
                "product_id": item.product_id,
                "quantity": item.quantity,
                "unit_price": product.price,
            })
        return resolved

    @staticmethod
    def _validate_transition(current: str, new: SupplierOrderStatus) -> None:
        """Guard valid status transitions."""
        allowed: dict[str, set[str]] = {
            SupplierOrderStatus.pending.value: {
                SupplierOrderStatus.confirmed.value,
                SupplierOrderStatus.cancelled.value,
            },
            SupplierOrderStatus.confirmed.value: {
                SupplierOrderStatus.preparing.value,
                SupplierOrderStatus.cancelled.value,
            },
            SupplierOrderStatus.preparing.value: {SupplierOrderStatus.shipped.value},
            SupplierOrderStatus.shipped.value: {SupplierOrderStatus.delivered.value},
            SupplierOrderStatus.delivered.value: set(),
            SupplierOrderStatus.cancelled.value: set(),
        }
        if new.value not in allowed.get(current, set()):
            raise BusinessError(
                "INVALID_STATUS_TRANSITION",
                f"Não é possível mudar de '{current}' para '{new.value}'",
            )

    async def _paginate(
        self, query, page: int, page_size: int
    ) -> tuple[Sequence[SupplierOrder], int]:
        count_q = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_q)).scalar_one()
        query = (
            query.order_by(SupplierOrder.created_at.desc())
            .options(
                selectinload(SupplierOrder.items).selectinload(SupplierOrderItem.product),
                selectinload(SupplierOrder.supplier),
                selectinload(SupplierOrder.establishment),
            )
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        result = await self.db.execute(query)
        return result.scalars().all(), total
