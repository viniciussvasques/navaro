"""Appointment and Checkin models."""

import enum
from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.establishment import Establishment
    from app.models.staff import StaffMember
    from app.models.user import User


class AppointmentStatus(str, enum.Enum):
    """Appointment status."""

    pending = "pending"
    confirmed = "confirmed"
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no_show"
    awaiting_deposit = "awaiting_deposit"


class PaymentType(str, enum.Enum):
    """Payment type for appointment."""

    single = "single"
    subscription = "subscription"


class PaymentMethod(str, enum.Enum):
    """Payment method for appointment."""

    card = "card"
    cash = "cash"
    wallet = "wallet"


class Appointment(BaseModel):
    """
    Appointment model.

    Represents a booking for a service.
    """

    __tablename__ = "appointments"

    # ─── Foreign Keys ──────────────────────────────────────────────────────────

    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
        doc="Customer user ID",
    )

    establishment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("establishments.id"),
        nullable=False,
        index=True,
        doc="Establishment ID",
    )

    staff_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("staff_members.id"),
        nullable=False,
        index=True,
        doc="Staff member ID",
    )

    service_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("services.id"),
        doc="Service ID (if single service)",
    )

    bundle_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("service_bundles.id"),
        doc="Bundle ID (if bundle)",
    )

    subscription_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("subscriptions.id"),
        doc="Subscription ID (if using subscription)",
    )

    # ─── Schedule ──────────────────────────────────────────────────────────────

    scheduled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
        doc="Scheduled date and time",
    )

    duration_minutes: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="Total duration in minutes",
    )

    # ─── Status ────────────────────────────────────────────────────────────────

    status: Mapped[AppointmentStatus] = mapped_column(
        Enum(AppointmentStatus),
        default=AppointmentStatus.pending,
        nullable=False,
        index=True,
        doc="Appointment status",
    )

    payment_type: Mapped[PaymentType] = mapped_column(
        Enum(PaymentType),
        nullable=False,
        doc="Payment type structure",
    )

    payment_method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod),
        default=PaymentMethod.card,
        nullable=False,
        doc="Payment method choice",
    )

    # ─── Notes ─────────────────────────────────────────────────────────────────

    notes: Mapped[str | None] = mapped_column(
        String(500),
        doc="Customer notes",
    )

    cancel_reason: Mapped[str | None] = mapped_column(
        String(200),
        doc="Reason for cancellation",
    )

    reminder_sent: Mapped[bool] = mapped_column(
        default=False,
        server_default="false",
        doc="Whether 24h reminder was sent",
    )

    # ─── Payment & Total ───────────────────────────────────────────────────────

    total_price: Mapped[float | None] = mapped_column(
        Numeric(10, 2),
        doc="Total price including products",
    )

    # ─── Relationships ─────────────────────────────────────────────────────────

    user: Mapped["User"] = relationship(
        "User",
        back_populates="appointments",
    )

    establishment: Mapped["Establishment"] = relationship(
        "Establishment",
        back_populates="appointments",
    )

    staff: Mapped["StaffMember"] = relationship(
        "StaffMember",
        back_populates="appointments",
    )

    service = relationship(
        "Service",
    )

    bundle = relationship(
        "ServiceBundle",
    )

    subscription = relationship(
        "Subscription",
    )

    products = relationship(
        "AppointmentProduct",
        back_populates="appointment",
        cascade="all, delete-orphan",
    )

    checkin = relationship(
        "Checkin",
        back_populates="appointment",
        uselist=False,
    )

    payment = relationship(
        "Payment",
        back_populates="appointment",
        uselist=False,
    )

    review = relationship(
        "Review",
        back_populates="appointment",
        uselist=False,
    )

    tip = relationship(
        "Tip",
        back_populates="appointment",
        uselist=False,
    )

    # ─── Indexes ───────────────────────────────────────────────────────────────

    __table_args__ = (
        Index("idx_appointments_staff_scheduled", "staff_id", "scheduled_at"),
        Index("idx_appointments_establishment_date", "establishment_id", "scheduled_at"),
        Index("idx_appointments_user_date", "user_id", "scheduled_at"),
    )


class AppointmentProduct(BaseModel):
    """
    Associative table between Appointment and Product.

    Represents a product sale linked to an appointment.
    """

    __tablename__ = "appointment_products"

    appointment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("appointments.id"),
        nullable=False,
        index=True,
    )

    product_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("products.id"),
        nullable=False,
        index=True,
    )

    quantity: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )

    unit_price: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        doc="Price at the moment of sale",
    )

    # ─── Relationships ─────────────────────────────────────────────────────────

    appointment = relationship(
        "Appointment",
        back_populates="products",
    )

    product = relationship(
        "Product",
        back_populates="appointment_items",
    )

    @property
    def name(self) -> str:
        """Get product name."""
        return self.product.name if self.product else "Desconhecido"

    def __repr__(self) -> str:
        return f"<Appointment(id={self.id}, status={self.status.value})>"


class Checkin(BaseModel):
    """
    Checkin model.

    Records when a customer checks in for their appointment.
    """

    __tablename__ = "checkins"

    # ─── Foreign Keys ──────────────────────────────────────────────────────────

    appointment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("appointments.id"),
        unique=True,
        nullable=False,
        doc="Appointment ID",
    )

    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
        doc="User ID",
    )

    establishment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("establishments.id"),
        nullable=False,
        index=True,
        doc="Establishment ID",
    )

    # ─── Checkin Data ──────────────────────────────────────────────────────────

    checked_in_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        doc="Check-in timestamp",
    )

    # ─── Relationships ─────────────────────────────────────────────────────────

    appointment = relationship(
        "Appointment",
        back_populates="checkin",
    )
