"""UserDebt model."""

import enum
from uuid import UUID

from sqlalchemy import Enum, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class DebtStatus(str, enum.Enum):
    """Debt status."""

    pending = "pending"
    paid = "paid"
    cancelled = "cancelled"


class UserDebt(BaseModel):
    """
    UserDebt model.

    Tracks unpaid fees (e.g., cancellation fees) for a user at an establishment.
    """

    __tablename__ = "user_debts"

    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    establishment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("establishments.id"),
        nullable=False,
        index=True,
    )

    appointment_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("appointments.id"),
        nullable=True,
    )

    amount: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )

    status: Mapped[DebtStatus] = mapped_column(
        Enum(DebtStatus),
        default=DebtStatus.pending,
        nullable=False,
        index=True,
    )

    # ─── Relationships ─────────────────────────────────────────────────────────

    user = relationship("User")
    establishment = relationship("Establishment")
    appointment = relationship("Appointment")

    def __repr__(self) -> str:
        return f"<UserDebt(id={self.id}, amount={self.amount}, status={self.status.value})>"
