"""Service and ServiceBundle models."""

from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import String, Boolean, Integer, Numeric, ForeignKey, Table, Column
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel, Base


if TYPE_CHECKING:
    from app.models.establishment import Establishment
    from app.models.staff import StaffMember


# ─── Many-to-Many: Service <-> Staff ───────────────────────────────────────────

service_staff = Table(
    "service_staff",
    Base.metadata,
    Column("service_id", PGUUID(as_uuid=True), ForeignKey("services.id"), primary_key=True),
    Column("staff_id", PGUUID(as_uuid=True), ForeignKey("staff_members.id"), primary_key=True),
)


class Service(BaseModel):
    """
    Service model.
    
    Represents a service offered by an establishment.
    """

    __tablename__ = "services"

    # ─── Foreign Keys ──────────────────────────────────────────────────────────
    
    establishment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("establishments.id"),
        nullable=False,
        index=True,
        doc="Establishment ID",
    )

    # ─── Service Info ──────────────────────────────────────────────────────────
    
    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        doc="Service name",
    )
    
    description: Mapped[str | None] = mapped_column(
        String(1000),
        doc="Service description",
    )
    
    price: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        doc="Service price",
    )
    
    duration_minutes: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=30,
        doc="Duration in minutes",
    )
    
    active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="Is service active",
    )
    
    sort_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Display order",
    )

    # ─── Relationships ─────────────────────────────────────────────────────────
    
    establishment: Mapped["Establishment"] = relationship(
        "Establishment",
        back_populates="services",
    )
    
    staff_members: Mapped[list["StaffMember"]] = relationship(
        "StaffMember",
        secondary=service_staff,
        back_populates="services",
    )
    
    bundle_items = relationship(
        "ServiceBundleItem",
        back_populates="service",
    )
    
    subscription_items = relationship(
        "SubscriptionPlanItem",
        back_populates="service",
    )

    def __repr__(self) -> str:
        return f"<Service(id={self.id}, name={self.name}, price={self.price})>"


# ─── Service Bundle (Combos) ───────────────────────────────────────────────────


class ServiceBundle(BaseModel):
    """
    Service bundle (combo) model.
    
    Represents a package of multiple services at a discounted price.
    """

    __tablename__ = "service_bundles"

    # ─── Foreign Keys ──────────────────────────────────────────────────────────
    
    establishment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("establishments.id"),
        nullable=False,
        index=True,
        doc="Establishment ID",
    )

    # ─── Bundle Info ───────────────────────────────────────────────────────────
    
    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        doc="Bundle name",
    )
    
    description: Mapped[str | None] = mapped_column(
        String(1000),
        doc="Bundle description",
    )
    
    original_price: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        doc="Sum of individual service prices",
    )
    
    bundle_price: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        doc="Discounted bundle price",
    )
    
    discount_percent: Mapped[float | None] = mapped_column(
        Numeric(5, 2),
        doc="Discount percentage",
    )
    
    active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="Is bundle active",
    )

    # ─── Relationships ─────────────────────────────────────────────────────────
    
    establishment: Mapped["Establishment"] = relationship(
        "Establishment",
        back_populates="service_bundles",
    )
    
    items = relationship(
        "ServiceBundleItem",
        back_populates="bundle",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<ServiceBundle(id={self.id}, name={self.name})>"


class ServiceBundleItem(BaseModel):
    """Service included in a bundle."""

    __tablename__ = "service_bundle_items"

    bundle_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("service_bundles.id"),
        nullable=False,
        index=True,
    )
    
    service_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("services.id"),
        nullable=False,
        index=True,
    )

    # ─── Relationships ─────────────────────────────────────────────────────────
    
    bundle = relationship(
        "ServiceBundle",
        back_populates="items",
    )
    
    service = relationship(
        "Service",
        back_populates="bundle_items",
    )
