"""Establishment model."""

import enum
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import JSON, Boolean, Enum, ForeignKey, Index, Numeric, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.user import User


class EstablishmentCategory(str, enum.Enum):
    """Establishment category."""

    barbershop = "barbershop"
    salon = "salon"
    barber_salon = "barber_salon"


class EstablishmentStatus(str, enum.Enum):
    """Establishment status."""

    pending = "pending"
    active = "active"
    suspended = "suspended"
    closed = "closed"


class SubscriptionTier(str, enum.Enum):
    """Platform subscription tier."""

    trial = "trial"
    active = "active"
    cancelled = "cancelled"


class Establishment(BaseModel):
    """
    Establishment model (barbershops, salons).

    Represents a business that offers services.
    """

    __tablename__ = "establishments"

    # ─── Owner ─────────────────────────────────────────────────────────────────

    owner_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
        doc="Owner user ID",
    )

    # ─── Basic Info ────────────────────────────────────────────────────────────

    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        doc="Business name",
    )

    slug: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
        doc="URL-friendly identifier",
    )

    category: Mapped[EstablishmentCategory] = mapped_column(
        Enum(EstablishmentCategory),
        nullable=False,
        doc="Business category",
    )

    description: Mapped[str | None] = mapped_column(
        String(1000),
        doc="Business description",
    )

    # ─── Location ──────────────────────────────────────────────────────────────

    address: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        doc="Street address",
    )

    city: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        doc="City",
    )

    state: Mapped[str] = mapped_column(
        String(2),
        nullable=False,
        doc="State (UF)",
    )

    zip_code: Mapped[str | None] = mapped_column(
        String(10),
        doc="ZIP code",
    )

    latitude: Mapped[float | None] = mapped_column(
        Numeric(10, 8),
        doc="Latitude coordinate",
    )

    longitude: Mapped[float | None] = mapped_column(
        Numeric(11, 8),
        doc="Longitude coordinate",
    )

    # ─── Contact ───────────────────────────────────────────────────────────────

    phone: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        doc="Phone number",
    )

    whatsapp: Mapped[str | None] = mapped_column(
        String(20),
        doc="WhatsApp number",
    )

    # ─── Visual ────────────────────────────────────────────────────────────────

    logo_url: Mapped[str | None] = mapped_column(
        String(500),
        doc="Logo image URL",
    )

    cover_url: Mapped[str | None] = mapped_column(
        String(500),
        doc="Cover image URL",
    )

    # ─── Google Integration ────────────────────────────────────────────────────

    google_place_id: Mapped[str | None] = mapped_column(
        String(255),
        doc="Google Places ID",
    )

    google_maps_url: Mapped[str | None] = mapped_column(
        String(500),
        doc="Google Maps URL",
    )

    # ─── Configuration ─────────────────────────────────────────────────────────

    business_hours: Mapped[dict] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
        doc="Business hours by day",
    )

    queue_mode_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        doc="Enable queue mode instead of appointments",
    )

    # ─── Status ────────────────────────────────────────────────────────────────

    status: Mapped[EstablishmentStatus] = mapped_column(
        Enum(EstablishmentStatus),
        default=EstablishmentStatus.pending,
        nullable=False,
        index=True,
        doc="Business status",
    )

    subscription_tier: Mapped[SubscriptionTier] = mapped_column(
        Enum(SubscriptionTier),
        default=SubscriptionTier.trial,
        nullable=False,
        doc="Platform subscription tier",
    )

    # ─── Stripe ────────────────────────────────────────────────────────────────

    stripe_account_id: Mapped[str | None] = mapped_column(
        String(255),
        doc="Stripe Connect account ID",
    )

    cancellation_fee_fixed: Mapped[float | None] = mapped_column(
        Numeric(10, 2),
        default=0.0,
        nullable=False,
        doc="Fixed cancellation fee",
    )

    no_show_fee_percent: Mapped[float | None] = mapped_column(
        Numeric(5, 2),
        default=0.0,
        nullable=False,
        doc="Percentage charged for no-show",
    )

    deposit_percent: Mapped[float | None] = mapped_column(
        Numeric(5, 2),
        default=0.0,
        nullable=False,
        doc="Default deposit percentage for appointments",
    )

    pending_platform_fees: Mapped[float] = mapped_column(
        Numeric(10, 2),
        default=0.0,
        nullable=False,
        doc="Accrued platform fees from cash/manual transactions",
    )

    # ─── Relationships ─────────────────────────────────────────────────────────

    owner: Mapped["User"] = relationship(
        "User",
        back_populates="establishments",
        foreign_keys=[owner_id],
    )

    staff_members = relationship(
        "StaffMember",
        back_populates="establishment",
        cascade="all, delete-orphan",
    )

    services = relationship(
        "Service",
        back_populates="establishment",
        cascade="all, delete-orphan",
    )

    service_bundles = relationship(
        "ServiceBundle",
        back_populates="establishment",
        cascade="all, delete-orphan",
    )

    subscription_plans = relationship(
        "SubscriptionPlan",
        back_populates="establishment",
        cascade="all, delete-orphan",
    )

    products = relationship(
        "Product",
        back_populates="establishment",
        cascade="all, delete-orphan",
    )

    appointments = relationship(
        "Appointment",
        back_populates="establishment",
    )

    reviews = relationship(
        "Review",
        back_populates="establishment",
    )

    portfolio_images = relationship(
        "PortfolioImage",
        back_populates="establishment",
        cascade="all, delete-orphan",
    )

    queue_entries = relationship(
        "QueueEntry",
        back_populates="establishment",
    )

    # ─── Indexes ───────────────────────────────────────────────────────────────

    __table_args__ = (
        Index("idx_establishments_city_status", "city", "status"),
        Index("idx_establishments_category", "category"),
    )

    def __repr__(self) -> str:
        return f"<Establishment(id={self.id}, name={self.name}, status={self.status.value})>"
