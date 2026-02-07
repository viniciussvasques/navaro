"""Product model."""

from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Product(BaseModel):
    """
    Product model.

    Represents an item sold by an establishment (gel, shampoo, etc.).
    """

    __tablename__ = "products"

    # ─── Foreign Keys ──────────────────────────────────────────────────────────

    establishment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("establishments.id"),
        nullable=False,
        index=True,
        doc="Establishment ID",
    )

    # ─── Product Info ──────────────────────────────────────────────────────────

    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        doc="Product name",
    )

    description: Mapped[str | None] = mapped_column(
        String(1000),
        doc="Product description",
    )

    price: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        doc="Product price (Selling Price)",
    )

    cost_price: Mapped[float | None] = mapped_column(
        Numeric(10, 2),
        nullable=True,
        doc="Cost price",
    )

    markup_percentage: Mapped[float | None] = mapped_column(
        Numeric(10, 2),
        nullable=True,
        doc="Markup percentage",
    )

    stock_quantity: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Quantity in stock",
    )

    active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="Is product active/listed",
    )

    image_url: Mapped[str | None] = mapped_column(
        String(500),
        doc="Product image URL",
    )

    # ─── Relationships ─────────────────────────────────────────────────────────

    establishment = relationship(
        "Establishment",
        back_populates="products",
    )

    appointment_items = relationship(
        "AppointmentProduct",
        back_populates="product",
    )

    @property
    def profit_margin(self) -> float | None:
        """Calculate profit margin percentage."""
        if self.price and self.cost_price and self.price > 0:
            return round(
                ((float(self.price) - float(self.cost_price)) / float(self.price)) * 100, 2
            )
        return None

    def __repr__(self) -> str:
        return f"<Product(id={self.id}, name={self.name}, price={self.price})>"
