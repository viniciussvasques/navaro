"""Supplier order service — B2B order management."""

from collections.abc import Sequence
from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BusinessError, ForbiddenError, NotFoundError
from app.core.logging import get_logger
from app.models.establishment import Establishment
from app.models.notification import NotificationType
from app.models.supplier import (
    Supplier,
    SupplierOrder,
    SupplierOrderItem,
    SupplierOrderStatus,
    SupplierProduct,
    SupplierStock,
)
from app.schemas.supplier import OrderItemCreate, SupplierOrderCreate, SupplierOrderStatusUpdate
from app.services.notification_service import NotificationService

logger = get_logger(__name__)

# Mensagens de status amigáveis para notificação do comprador
_STATUS_MESSAGES: dict[str, str] = {
    SupplierOrderStatus.confirmed.value: "Seu pedido foi confirmado pelo fornecedor.",
    SupplierOrderStatus.preparing.value: "Seu pedido está em separação.",
    SupplierOrderStatus.shipped.value: "Seu pedido foi enviado.",
    SupplierOrderStatus.delivered.value: "Seu pedido foi entregue.",
    SupplierOrderStatus.cancelled.value: "Seu pedido foi cancelado.",
}


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

        # Notifica o dono do fornecedor sobre o novo pedido (best-effort).
        await self._notify_supplier_owner(
            supplier,
            title="Novo pedido recebido",
            message=f"Você recebeu um novo pedido de R$ {total:.2f}.",
            order_id=order.id,
        )

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
        if data.status == SupplierOrderStatus.delivered:
            order.delivered_at = datetime.now(UTC)
        if data.status == SupplierOrderStatus.confirmed:
            await self._decrement_stock(order_id)

        await self.db.commit()
        await self.db.refresh(order)

        # Notifica o dono do estabelecimento sobre a mudança de status.
        await self._notify_establishment_owner(
            order.establishment_id,
            title="Atualização do seu pedido",
            message=_STATUS_MESSAGES.get(order.status, "Status do pedido atualizado."),
            order_id=order.id,
        )
        return order

    async def cancel_by_buyer(
        self, order_id: UUID, establishment_id: UUID
    ) -> SupplierOrder | None:
        """Allow the buyer (establishment) to cancel an order still pending."""
        result = await self.db.execute(
            select(SupplierOrder).where(
                SupplierOrder.id == order_id,
                SupplierOrder.establishment_id == establishment_id,
            )
            .options(selectinload(SupplierOrder.supplier))
        )
        order = result.scalar_one_or_none()
        if not order:
            return None
        if order.status != SupplierOrderStatus.pending.value:
            raise BusinessError(
                "CANNOT_CANCEL",
                "Só é possível cancelar pedidos que ainda estão aguardando confirmação.",
            )
        order.status = SupplierOrderStatus.cancelled.value
        await self.db.commit()
        await self.db.refresh(order)

        if order.supplier:
            await self._notify_supplier_owner(
                order.supplier,
                title="Pedido cancelado",
                message="Um pedido foi cancelado pelo estabelecimento.",
                order_id=order.id,
            )
        return order

    async def _decrement_stock(self, order_id: UUID) -> None:
        """Reduce stock for each order item when the order is confirmed."""
        result = await self.db.execute(
            select(SupplierOrderItem)
            .where(SupplierOrderItem.order_id == order_id)
            .options(selectinload(SupplierOrderItem.product).selectinload(SupplierProduct.stock))
        )
        for item in result.scalars().all():
            stock = item.product.stock if item.product else None
            if stock:
                stock.quantity = max(0, stock.quantity - item.quantity)

    async def _notify_supplier_owner(
        self, supplier: Supplier, *, title: str, message: str, order_id: UUID
    ) -> None:
        try:
            notif = NotificationService(self.db)
            await notif.create_in_app(
                user_id=str(supplier.owner_user_id),
                title=title,
                message=message,
                type=NotificationType.system,
                data={"supplier_order_id": str(order_id), "kind": "supplier_order"},
            )
        except Exception as exc:  # noqa: BLE001 - notificação é best-effort
            logger.warning("Falha ao notificar fornecedor", error=str(exc))

    async def _notify_establishment_owner(
        self, establishment_id: UUID, *, title: str, message: str, order_id: UUID
    ) -> None:
        try:
            est = await self.db.get(Establishment, establishment_id)
            if not est:
                return
            notif = NotificationService(self.db)
            await notif.create_in_app(
                user_id=str(est.owner_id),
                title=title,
                message=message,
                type=NotificationType.system,
                data={"supplier_order_id": str(order_id), "kind": "supplier_order"},
            )
        except Exception as exc:  # noqa: BLE001 - notificação é best-effort
            logger.warning("Falha ao notificar estabelecimento", error=str(exc))

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
