"""Payment, Tip, and Payout models."""

import enum
from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Numeric, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.appointment import Appointment
    from app.models.staff import StaffMember


class PaymentStatus(str, enum.Enum):
    """Payment status."""

    pending = "pending"
    processing = "processing"
    succeeded = "succeeded"
    failed = "failed"
    refunded = "refunded"


class PaymentPurpose(str, enum.Enum):
    """Payment purpose."""

    single = "single"
    subscription = "subscription"
    subscription_renewal = "subscription_renewal"


class Payment(BaseModel):
    """
    Payment model.

    Represents a payment transaction.
    """

    __tablename__ = "payments"

    # ─── Foreign Keys ──────────────────────────────────────────────────────────

    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
        doc="Payer user ID",
    )

    establishment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("establishments.id"),
        nullable=False,
        index=True,
        doc="Establishment ID",
    )

    appointment_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("appointments.id"),
        doc="Related appointment (if single payment)",
    )

    subscription_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("subscriptions.id"),
        doc="Related subscription (if subscription payment)",
    )

    # ─── Payment Info ──────────────────────────────────────────────────────────

    purpose: Mapped[PaymentPurpose] = mapped_column(
        Enum(PaymentPurpose),
        nullable=False,
        doc="Payment purpose",
    )

    amount: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        doc="Total amount charged",
    )

    platform_fee: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        doc="Platform fee (5%)",
    )

    gateway_fee: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        doc="Payment gateway fee (~3%)",
    )

    net_amount: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        doc="Net amount for establishment",
    )

    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus),
        default=PaymentStatus.pending,
        nullable=False,
        index=True,
        doc="Payment status",
    )

    # ─── Stripe ────────────────────────────────────────────────────────────────

    stripe_payment_id: Mapped[str | None] = mapped_column(
        String(255),
        doc="Stripe Payment Intent ID (Legacy)",
    )

    provider: Mapped[str] = mapped_column(
        String(50),
        default="stripe",
        nullable=False,
        doc="Payment provider name (stripe, mercadopago, pix, cash, etc)",
    )

    provider_payment_id: Mapped[str | None] = mapped_column(
        String(255),
        index=True,
        doc="Generic provider payment ID",
    )

    stripe_payment_method: Mapped[str | None] = mapped_column(
        String(255),
        doc="Stripe Payment Method ID",
    )

    # ─── Relationships ─────────────────────────────────────────────────────────

    user = relationship(
        "User",
    )

    establishment = relationship(
        "Establishment",
    )

    appointment: Mapped["Appointment | None"] = relationship(
        "Appointment",
        back_populates="payment",
    )

    subscription = relationship(
        "Subscription",
    )

    # ─── Indexes ───────────────────────────────────────────────────────────────

    __table_args__ = (
        Index("idx_payments_establishment_date", "establishment_id", "created_at"),
        Index("idx_payments_status", "status"),
    )

    def __repr__(self) -> str:
        return f"<Payment(id={self.id}, amount={self.amount}, status={self.status.value})>"


class Tip(BaseModel):
    """
    Tip model.

    Represents a tip given to a staff member.
    """

    __tablename__ = "tips"

    # ─── Foreign Keys ──────────────────────────────────────────────────────────

    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
        doc="Tipper user ID",
    )

    staff_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("staff_members.id"),
        nullable=False,
        index=True,
        doc="Staff member receiving tip",
    )

    establishment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("establishments.id"),
        nullable=False,
        index=True,
        doc="Establishment ID",
    )

    appointment_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("appointments.id"),
        doc="Related appointment",
    )

    # ─── Tip Info ──────────────────────────────────────────────────────────────

    amount: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        doc="Tip amount",
    )

    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus),
        default=PaymentStatus.pending,
        nullable=False,
        doc="Tip payment status",
    )

    # ─── Stripe ────────────────────────────────────────────────────────────────

    stripe_payment_id: Mapped[str | None] = mapped_column(
        String(255),
        doc="Stripe Payment Intent ID (Legacy)",
    )

    provider: Mapped[str] = mapped_column(
        String(50),
        default="stripe",
        nullable=False,
        doc="Payment provider name",
    )

    provider_payment_id: Mapped[str | None] = mapped_column(
        String(255),
        index=True,
        doc="Generic provider payment ID",
    )

    # ─── Relationships ─────────────────────────────────────────────────────────

    user = relationship(
        "User",
    )

    staff: Mapped["StaffMember"] = relationship(
        "StaffMember",
        back_populates="tips_received",
    )

    establishment = relationship(
        "Establishment",
    )

    appointment: Mapped["Appointment | None"] = relationship(
        "Appointment",
        back_populates="tip",
    )

    def __repr__(self) -> str:
        return f"<Tip(id={self.id}, amount={self.amount})>"


class Payout(BaseModel):
    """
    Payout model.

    Represents a payout to an establishment.
    """

    __tablename__ = "payouts"

    # ─── Foreign Keys ──────────────────────────────────────────────────────────

    establishment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("establishments.id"),
        nullable=False,
        index=True,
        doc="Establishment ID",
    )

    # ─── Payout Info ───────────────────────────────────────────────────────────

    amount: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        doc="Payout amount",
    )

    status: Mapped[str] = mapped_column(
        String(50),
        default="pending",
        nullable=False,
        doc="Payout status",
    )

    paid_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        doc="When payout was completed",
    )

    # ─── Stripe ────────────────────────────────────────────────────────────────

    stripe_payout_id: Mapped[str | None] = mapped_column(
        String(255),
        doc="Stripe Payout ID",
    )

    stripe_transfer_id: Mapped[str | None] = mapped_column(
        String(255),
        doc="Stripe Transfer ID",
    )

    # ─── Relationships ─────────────────────────────────────────────────────────

    establishment = relationship(
        "Establishment",
    )

    def __repr__(self) -> str:
        return f"<Payout(id={self.id}, amount={self.amount}, status={self.status})>"
