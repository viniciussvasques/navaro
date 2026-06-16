"""Supplier models — B2B marketplace DUNNAA Pro."""

import enum
from decimal import Decimal
from uuid import UUID

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


# ─── Enums ─────────────────────────────────────────────────────────────────────


class SupplierSegment(str, enum.Enum):
    """Type of products/services the supplier offers."""

    chemicals = "chemicals"          # Insumos químicos (shampoo, tintura, creme)
    equipment = "equipment"          # Equipamentos (cadeiras, secadores)
    disposables = "disposables"      # Descartáveis (luvas, toucas, máscaras)
    cosmetics = "cosmetics"          # Cosméticos & produtos de revenda
    furniture = "furniture"          # Mobiliário & decoração
    technology = "technology"        # Tecnologia & software
    other = "other"                  # Outros


class SupplierProductUnit(str, enum.Enum):
    """Unit of measure for products."""

    unit = "unit"       # Unidade
    box = "box"         # Caixa
    pack = "pack"       # Pacote
    liter = "liter"     # Litro
    kg = "kg"           # Quilograma
    meter = "meter"     # Metro


class SupplierOrderStatus(str, enum.Enum):
    """B2B order lifecycle."""

    pending = "pending"       # Aguardando confirmação do fornecedor
    confirmed = "confirmed"   # Confirmado pelo fornecedor
    preparing = "preparing"   # Em separação
    shipped = "shipped"       # Enviado
    delivered = "delivered"   # Entregue
    cancelled = "cancelled"   # Cancelado


# ─── Supplier ──────────────────────────────────────────────────────────────────


class Supplier(BaseModel):
    """Supplier (fornecedor) profile — owned by a DUNNAA user."""

    __tablename__ = "suppliers"

    # ─── Owner ──────────────────────────────────────────────────────────────────

    owner_user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
        doc="User who owns/manages this supplier profile",
    )

    # ─── Identity ───────────────────────────────────────────────────────────────

    name: Mapped[str] = mapped_column(
        String(200), nullable=False, doc="Supplier / company name"
    )
    cnpj: Mapped[str | None] = mapped_column(
        String(18), unique=True, index=True, doc="CNPJ (XX.XXX.XXX/XXXX-XX)"
    )
    logo_url: Mapped[str | None] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text)
    segment: Mapped[SupplierSegment] = mapped_column(
        String(30), nullable=False, default=SupplierSegment.other.value
    )

    # ─── Contact & Location ─────────────────────────────────────────────────────

    phone: Mapped[str | None] = mapped_column(String(20))
    whatsapp: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(255))
    website: Mapped[str | None] = mapped_column(String(500))
    city: Mapped[str | None] = mapped_column(String(100))
    state: Mapped[str | None] = mapped_column(String(2))
    ships_nationwide: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False,
        doc="Delivers to the whole country"
    )

    # ─── Status ─────────────────────────────────────────────────────────────────

    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    verified: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False,
        doc="Admin-approved supplier"
    )
    rating: Mapped[Decimal | None] = mapped_column(
        Numeric(3, 2), doc="Average rating (1–5)"
    )
    total_reviews: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_orders: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # ─── Relationships ───────────────────────────────────────────────────────────

    owner = relationship("User", foreign_keys=[owner_user_id])
    products = relationship(
        "SupplierProduct",
        back_populates="supplier",
        cascade="all, delete-orphan",
    )
    promotions = relationship(
        "SupplierPromotion",
        back_populates="supplier",
        cascade="all, delete-orphan",
    )
    orders = relationship(
        "SupplierOrder",
        back_populates="supplier",
    )
    reviews = relationship(
        "SupplierReview",
        back_populates="supplier",
        cascade="all, delete-orphan",
    )

    # ─── Indexes ────────────────────────────────────────────────────────────────

    __table_args__ = (
        Index("idx_suppliers_segment_active", "segment", "active"),
    )

    def __repr__(self) -> str:
        return f"<Supplier(id={self.id}, name={self.name}, segment={self.segment})>"


# ─── Supplier Product ──────────────────────────────────────────────────────────


class SupplierProduct(BaseModel):
    """Product in a supplier's catalog."""

    __tablename__ = "supplier_products"

    # ─── Owner ──────────────────────────────────────────────────────────────────

    supplier_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("suppliers.id"),
        nullable=False,
        index=True,
    )

    # ─── Product Info ────────────────────────────────────────────────────────────

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    sku: Mapped[str | None] = mapped_column(
        String(100), doc="Stock Keeping Unit / código interno"
    )
    image_url: Mapped[str | None] = mapped_column(String(500))
    unit: Mapped[SupplierProductUnit] = mapped_column(
        String(20), nullable=False, default=SupplierProductUnit.unit.value
    )
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    moq: Mapped[int] = mapped_column(
        Integer, default=1, nullable=False,
        doc="Minimum order quantity"
    )
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # ─── Relationships ───────────────────────────────────────────────────────────

    supplier = relationship("Supplier", back_populates="products")
    stock = relationship(
        "SupplierStock",
        back_populates="product",
        uselist=False,
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("idx_supplier_products_supplier_active", "supplier_id", "active"),
    )

    def __repr__(self) -> str:
        return f"<SupplierProduct(id={self.id}, name={self.name}, price={self.price})>"


# ─── Supplier Stock ─────────────────────────────────────────────────────────────


class SupplierStock(BaseModel):
    """Stock level for a supplier product."""

    __tablename__ = "supplier_stock"

    product_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("supplier_products.id"),
        nullable=False,
        unique=True,
        index=True,
    )
    quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    min_threshold: Mapped[int] = mapped_column(
        Integer, default=5, nullable=False,
        doc="Alert when stock falls below this"
    )

    product = relationship("SupplierProduct", back_populates="stock")

    def __repr__(self) -> str:
        return f"<SupplierStock(product_id={self.product_id}, qty={self.quantity})>"


# ─── Supplier Order ────────────────────────────────────────────────────────────


class SupplierOrder(BaseModel):
    """B2B order from an establishment to a supplier."""

    __tablename__ = "supplier_orders"

    # ─── Parties ─────────────────────────────────────────────────────────────────

    supplier_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("suppliers.id"),
        nullable=False,
        index=True,
    )
    establishment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("establishments.id"),
        nullable=False,
        index=True,
    )

    # ─── Order Data ──────────────────────────────────────────────────────────────

    status: Mapped[SupplierOrderStatus] = mapped_column(
        String(20),
        nullable=False,
        default=SupplierOrderStatus.pending.value,
        index=True,
    )
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    notes: Mapped[str | None] = mapped_column(Text)
    tracking_code: Mapped[str | None] = mapped_column(String(200))
    delivered_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))

    # ─── Relationships ───────────────────────────────────────────────────────────

    supplier = relationship("Supplier", back_populates="orders")
    establishment = relationship("Establishment")
    items = relationship(
        "SupplierOrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("idx_supplier_orders_supplier_status", "supplier_id", "status"),
        Index("idx_supplier_orders_establishment", "establishment_id", "status"),
    )

    def __repr__(self) -> str:
        return f"<SupplierOrder(id={self.id}, status={self.status}, total={self.total})>"


# ─── Supplier Order Item ───────────────────────────────────────────────────────


class SupplierOrderItem(BaseModel):
    """Line item inside a supplier order."""

    __tablename__ = "supplier_order_items"

    order_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("supplier_orders.id"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("supplier_products.id"),
        nullable=False,
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    order = relationship("SupplierOrder", back_populates="items")
    product = relationship("SupplierProduct")

    def __repr__(self) -> str:
        return f"<SupplierOrderItem(order={self.order_id}, product={self.product_id}, qty={self.quantity})>"


# ─── Supplier Promotion ────────────────────────────────────────────────────────


class SupplierPromotion(BaseModel):
    """Promotional campaign from a supplier for establishments."""

    __tablename__ = "supplier_promotions"

    supplier_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("suppliers.id"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    discount_percent: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    starts_at: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    supplier = relationship("Supplier", back_populates="promotions")

    def __repr__(self) -> str:
        return f"<SupplierPromotion(id={self.id}, title={self.title})>"


# ─── Supplier Review ──────────────────────────────────────────────────────────


class SupplierReview(BaseModel):
    """Review of a supplier by an establishment (post-delivery)."""

    __tablename__ = "supplier_reviews"

    supplier_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("suppliers.id"),
        nullable=False,
        index=True,
    )
    establishment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("establishments.id"),
        nullable=False,
        index=True,
    )
    order_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("supplier_orders.id"),
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False, doc="1–5")
    comment: Mapped[str | None] = mapped_column(Text)
    owner_response: Mapped[str | None] = mapped_column(Text)

    supplier = relationship("Supplier", back_populates="reviews")
    establishment = relationship("Establishment")

    __table_args__ = (
        Index("idx_supplier_reviews_supplier", "supplier_id"),
    )

    def __repr__(self) -> str:
        return f"<SupplierReview(supplier={self.supplier_id}, rating={self.rating})>"
