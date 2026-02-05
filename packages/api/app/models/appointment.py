"""Appointment and Checkin models."""

import enum
from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import String, Integer, ForeignKey, Enum, DateTime, Index
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.establishment import Establishment
    from app.models.staff import StaffMember
    from app.models.service import Service, ServiceBundle


class AppointmentStatus(str, enum.Enum):
    """Appointment status."""

    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class PaymentType(str, enum.Enum):
    """Payment type for appointment."""

    SINGLE = "single"
    SUBSCRIPTION = "subscription"


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
        default=AppointmentStatus.PENDING,
        nullable=False,
        index=True,
        doc="Appointment status",
    )
    
    payment_type: Mapped[PaymentType] = mapped_column(
        Enum(PaymentType),
        nullable=False,
        doc="Payment type",
    )

    # ─── Notes ─────────────────────────────────────────────────────────────────
    
    notes: Mapped[str | None] = mapped_column(
        String(500),
        doc="Customer notes",
    )
    
    cancel_reason: Mapped[str | None] = mapped_column(
        String(500),
        doc="Cancellation reason",
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
