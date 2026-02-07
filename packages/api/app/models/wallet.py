"""Wallet models."""

import enum
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import Enum, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.user import User


class TransactionType(str, enum.Enum):
    """Wallet transaction type."""

    deposit = "deposit"  # Adding money to wallet
    payment = "payment"  # Paying for service
    refund = "refund"  # Money back
    cashback = "cashback"  # Platform loyalty
    fee = "fee"  # System or penalty fee
    commission = "commission"  # Staff earning
    referral = "referral"  # Reward for inviting others


class TransactionStatus(str, enum.Enum):
    """Wallet transaction status."""

    pending = "pending"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


class UserWallet(BaseModel):
    """
    User wallet to store balance.
    """

    __tablename__ = "user_wallets"

    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        unique=True,
        nullable=False,
        index=True,
    )

    balance: Mapped[float] = mapped_column(
        Numeric(12, 2),
        default=0.0,
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", backref="wallet", uselist=False)
    transactions: Mapped[list["WalletTransaction"]] = relationship(
        "WalletTransaction",
        back_populates="wallet",
        cascade="all, delete-orphan",
        order_by="WalletTransaction.created_at.desc()",
    )


class WalletTransaction(BaseModel):
    """
    Wallet transaction history.
    """

    __tablename__ = "wallet_transactions"

    wallet_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("user_wallets.id"),
        nullable=False,
        index=True,
    )

    type: Mapped[TransactionType] = mapped_column(
        Enum(TransactionType),
        nullable=False,
        index=True,
    )

    amount: Mapped[float] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    status: Mapped[TransactionStatus] = mapped_column(
        Enum(TransactionStatus),
        default=TransactionStatus.pending,
        nullable=False,
        index=True,
    )

    description: Mapped[str | None] = mapped_column(
        String(255),
    )

    reference_id: Mapped[str | None] = mapped_column(
        String(255),
        doc="External reference (e.g. Stripe ID, Appointment ID)",
    )

    # Relationships
    wallet: Mapped["UserWallet"] = relationship("UserWallet", back_populates="transactions")
