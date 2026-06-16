"""Supplier service — B2B marketplace."""

from collections.abc import Sequence
from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import AlreadyExistsError, NotFoundError
from app.core.permissions import promote_to_role
from app.models.supplier import (
    Supplier,
    SupplierProduct,
    SupplierPromotion,
    SupplierReview,
    SupplierStock,
)
from app.models.user import User, UserRole
from app.schemas.supplier import (
    SupplierCreate,
    SupplierProductCreate,
    SupplierProductUpdate,
    SupplierPromotionCreate,
    SupplierPromotionUpdate,
    SupplierReviewCreate,
    SupplierStockUpdate,
    SupplierUpdate,
)


class SupplierService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ─── Supplier CRUD ────────────────────────────────────────────────────────

    async def get(self, supplier_id: UUID) -> Supplier | None:
        result = await self.db.execute(
            select(Supplier)
            .where(Supplier.id == supplier_id)
            .options(selectinload(Supplier.products))
        )
        return result.scalar_one_or_none()

    async def get_by_owner(self, owner_user_id: UUID) -> Supplier | None:
        result = await self.db.execute(
            select(Supplier).where(Supplier.owner_user_id == owner_user_id)
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        *,
        segment: str | None = None,
        city: str | None = None,
        active_only: bool = True,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[Sequence[Supplier], int]:
        query = select(Supplier)
        if active_only:
            query = query.where(Supplier.active == True)  # noqa: E712
        if segment:
            query = query.where(Supplier.segment == segment)
        if city:
            query = query.where(Supplier.city.ilike(f"%{city}%"))

        count_q = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_q)
        total = total_result.scalar_one()

        query = query.order_by(Supplier.verified.desc(), Supplier.rating.desc().nullslast(), Supplier.name)
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        return result.scalars().all(), total

    async def create(self, owner_user_id: UUID, data: SupplierCreate) -> Supplier:
        if data.cnpj:
            existing = await self.db.execute(
                select(Supplier).where(Supplier.cnpj == data.cnpj)
            )
            if existing.scalar_one_or_none():
                raise AlreadyExistsError("Fornecedor", field="cnpj")

        supplier = Supplier(
            owner_user_id=owner_user_id,
            **data.model_dump(),
        )
        self.db.add(supplier)

        # Promove o role para 'supplier' sem rebaixar owner/admin, espelhando o
        # fluxo de establishment (customer -> owner).
        user = await self.db.get(User, owner_user_id)
        if user:
            promote_to_role(user, UserRole.supplier)

        await self.db.commit()
        await self.db.refresh(supplier)
        return supplier

    async def update(self, supplier_id: UUID, data: SupplierUpdate) -> Supplier | None:
        result = await self.db.execute(
            select(Supplier).where(Supplier.id == supplier_id)
        )
        supplier = result.scalar_one_or_none()
        if not supplier:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(supplier, field, value)
        await self.db.commit()
        await self.db.refresh(supplier)
        return supplier

    async def set_verified(self, supplier_id: UUID, verified: bool) -> Supplier | None:
        """Admin-only: mark a supplier as verified/unverified."""
        supplier = await self.db.get(Supplier, supplier_id)
        if not supplier:
            return None
        supplier.verified = verified
        await self.db.commit()
        await self.db.refresh(supplier)
        return supplier

    async def get_summary(self, supplier_id: UUID) -> dict:
        """Dashboard metrics for a supplier (revenue, orders by status, top products)."""
        from app.models.supplier import SupplierOrder, SupplierOrderItem, SupplierOrderStatus

        # Pedidos por status
        status_rows = await self.db.execute(
            select(SupplierOrder.status, func.count())
            .where(SupplierOrder.supplier_id == supplier_id)
            .group_by(SupplierOrder.status)
        )
        orders_by_status = {row[0]: row[1] for row in status_rows.all()}

        # Receita (pedidos entregues)
        revenue_row = await self.db.execute(
            select(func.coalesce(func.sum(SupplierOrder.total), 0)).where(
                SupplierOrder.supplier_id == supplier_id,
                SupplierOrder.status == SupplierOrderStatus.delivered.value,
            )
        )
        revenue = float(revenue_row.scalar_one() or 0)

        # Pedidos pendentes (aguardando ação do fornecedor)
        pending = orders_by_status.get(SupplierOrderStatus.pending.value, 0)

        # Top produtos por quantidade vendida
        top_rows = await self.db.execute(
            select(
                SupplierProduct.name,
                func.sum(SupplierOrderItem.quantity).label("qty"),
            )
            .join(SupplierOrderItem, SupplierOrderItem.product_id == SupplierProduct.id)
            .join(SupplierOrder, SupplierOrder.id == SupplierOrderItem.order_id)
            .where(SupplierOrder.supplier_id == supplier_id)
            .group_by(SupplierProduct.name)
            .order_by(func.sum(SupplierOrderItem.quantity).desc())
            .limit(5)
        )
        top_products = [{"name": r[0], "quantity": int(r[1])} for r in top_rows.all()]

        # Total de produtos ativos
        active_products_row = await self.db.execute(
            select(func.count()).where(
                SupplierProduct.supplier_id == supplier_id,
                SupplierProduct.active == True,  # noqa: E712
            )
        )
        active_products = active_products_row.scalar_one()

        return {
            "revenue_delivered": revenue,
            "pending_orders": pending,
            "orders_by_status": orders_by_status,
            "active_products": active_products,
            "top_products": top_products,
        }

    # ─── Products ─────────────────────────────────────────────────────────────

    async def list_products(
        self, supplier_id: UUID, *, active_only: bool = True
    ) -> Sequence[SupplierProduct]:
        query = select(SupplierProduct).where(SupplierProduct.supplier_id == supplier_id)
        if active_only:
            query = query.where(SupplierProduct.active == True)  # noqa: E712
        query = query.options(selectinload(SupplierProduct.stock))
        query = query.order_by(SupplierProduct.sort_order, SupplierProduct.name)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_product(self, product_id: UUID) -> SupplierProduct | None:
        result = await self.db.execute(
            select(SupplierProduct)
            .where(SupplierProduct.id == product_id)
            .options(selectinload(SupplierProduct.stock))
        )
        return result.scalar_one_or_none()

    async def create_product(
        self, supplier_id: UUID, data: SupplierProductCreate
    ) -> SupplierProduct:
        product = SupplierProduct(supplier_id=supplier_id, **data.model_dump())
        self.db.add(product)
        await self.db.flush()

        stock = SupplierStock(product_id=product.id, quantity=0)
        self.db.add(stock)

        await self.db.commit()
        await self.db.refresh(product)
        return product

    async def update_product(
        self, product_id: UUID, data: SupplierProductUpdate
    ) -> SupplierProduct | None:
        result = await self.db.execute(
            select(SupplierProduct).where(SupplierProduct.id == product_id)
        )
        product = result.scalar_one_or_none()
        if not product:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(product, field, value)
        await self.db.commit()
        await self.db.refresh(product)
        return product

    async def delete_product(self, product_id: UUID) -> bool:
        result = await self.db.execute(
            select(SupplierProduct).where(SupplierProduct.id == product_id)
        )
        product = result.scalar_one_or_none()
        if not product:
            return False
        await self.db.delete(product)
        await self.db.commit()
        return True

    # ─── Stock ────────────────────────────────────────────────────────────────

    async def update_stock(
        self, product_id: UUID, data: SupplierStockUpdate
    ) -> SupplierStock | None:
        result = await self.db.execute(
            select(SupplierStock).where(SupplierStock.product_id == product_id)
        )
        stock = result.scalar_one_or_none()
        if not stock:
            product = await self.db.get(SupplierProduct, product_id)
            if not product:
                raise NotFoundError("Produto")
            stock = SupplierStock(product_id=product_id)
            self.db.add(stock)

        stock.quantity = data.quantity
        stock.min_threshold = data.min_threshold
        await self.db.commit()
        await self.db.refresh(stock)
        return stock

    async def list_low_stock(self, supplier_id: UUID) -> Sequence[SupplierProduct]:
        result = await self.db.execute(
            select(SupplierProduct)
            .join(SupplierStock, SupplierProduct.id == SupplierStock.product_id)
            .where(
                SupplierProduct.supplier_id == supplier_id,
                SupplierProduct.active == True,  # noqa: E712
                SupplierStock.quantity <= SupplierStock.min_threshold,
            )
            .options(selectinload(SupplierProduct.stock))
        )
        return result.scalars().all()

    # ─── Promotions ───────────────────────────────────────────────────────────

    async def list_promotions(
        self, supplier_id: UUID, *, active_only: bool = False
    ) -> Sequence[SupplierPromotion]:
        query = select(SupplierPromotion).where(SupplierPromotion.supplier_id == supplier_id)
        if active_only:
            now = datetime.now(UTC)
            query = query.where(
                SupplierPromotion.active == True,  # noqa: E712
                SupplierPromotion.starts_at <= now,
                SupplierPromotion.ends_at >= now,
            )
        query = query.order_by(SupplierPromotion.starts_at.desc())
        result = await self.db.execute(query)
        return result.scalars().all()

    async def create_promotion(
        self, supplier_id: UUID, data: SupplierPromotionCreate
    ) -> SupplierPromotion:
        promo = SupplierPromotion(supplier_id=supplier_id, **data.model_dump())
        self.db.add(promo)
        await self.db.commit()
        await self.db.refresh(promo)
        return promo

    async def update_promotion(
        self, promotion_id: UUID, data: SupplierPromotionUpdate
    ) -> SupplierPromotion | None:
        result = await self.db.execute(
            select(SupplierPromotion).where(SupplierPromotion.id == promotion_id)
        )
        promo = result.scalar_one_or_none()
        if not promo:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(promo, field, value)
        await self.db.commit()
        await self.db.refresh(promo)
        return promo

    # ─── Reviews ──────────────────────────────────────────────────────────────

    async def list_reviews(
        self, supplier_id: UUID, *, page: int = 1, page_size: int = 20
    ) -> tuple[Sequence[SupplierReview], int]:
        query = select(SupplierReview).where(SupplierReview.supplier_id == supplier_id)
        count_q = select(func.count()).select_from(query.subquery())
        total = (await self.db.execute(count_q)).scalar_one()
        query = query.order_by(SupplierReview.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        return result.scalars().all(), total

    async def create_review(
        self, establishment_id: UUID, data: SupplierReviewCreate
    ) -> SupplierReview:
        from app.core.exceptions import BusinessError
        from app.models.supplier import SupplierOrder

        # Só pode avaliar quem já fez pelo menos um pedido a este fornecedor.
        order_exists = await self.db.execute(
            select(SupplierOrder.id).where(
                SupplierOrder.supplier_id == data.supplier_id,
                SupplierOrder.establishment_id == establishment_id,
            ).limit(1)
        )
        if not order_exists.scalar_one_or_none():
            raise BusinessError(
                "NO_ORDER_HISTORY",
                "Você só pode avaliar fornecedores dos quais já fez pedidos.",
            )

        review = SupplierReview(
            supplier_id=data.supplier_id,
            establishment_id=establishment_id,
            order_id=data.order_id,
            rating=data.rating,
            comment=data.comment,
        )
        self.db.add(review)
        await self.db.flush()
        await self._update_supplier_rating(data.supplier_id)
        await self.db.commit()
        await self.db.refresh(review)
        return review

    async def respond_review(self, review_id: UUID, response: str) -> SupplierReview | None:
        result = await self.db.execute(
            select(SupplierReview).where(SupplierReview.id == review_id)
        )
        review = result.scalar_one_or_none()
        if not review:
            return None
        review.owner_response = response
        await self.db.commit()
        await self.db.refresh(review)
        return review

    async def _update_supplier_rating(self, supplier_id: UUID) -> None:
        """Recalculate supplier average rating after new review."""
        avg_q = select(func.avg(SupplierReview.rating)).where(
            SupplierReview.supplier_id == supplier_id
        )
        count_q = select(func.count()).where(SupplierReview.supplier_id == supplier_id)
        avg = (await self.db.execute(avg_q)).scalar_one_or_none()
        count = (await self.db.execute(count_q)).scalar_one()
        supplier = await self.db.get(Supplier, supplier_id)
        if supplier:
            supplier.rating = Decimal(str(round(float(avg or 0), 2)))
            supplier.total_reviews = count
