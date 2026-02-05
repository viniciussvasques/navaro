"""Subscription models."""

import enum
from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import String, Boolean, Integer, Numeric, ForeignKey, Enum, DateTime, Date
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.establishment import Establishment
    from app.models.user import User
    from app.models.service import Service, ServiceBundle


class SubscriptionStatus(str, enum.Enum):
    """Subscription status."""

    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    PAUSED = "paused"


class SubscriptionPlan(BaseModel):
    """
    Subscription plan model.
    
    Represents a subscription plan created by an establishment.
    """

    __tablename__ = "subscription_plans"

    # ─── Foreign Keys ──────────────────────────────────────────────────────────
    
    establishment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("establishments.id"),
        nullable=False,
        index=True,
        doc="Establishment ID",
    )

    # ─── Plan Info ─────────────────────────────────────────────────────────────
    
    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        doc="Plan name",
    )
    
    description: Mapped[str | None] = mapped_column(
        String(1000),
        doc="Plan description",
    )
    
    price: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        doc="Monthly price",
    )
    
    active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="Is plan active",
    )

    # ─── Stripe ────────────────────────────────────────────────────────────────
    
    stripe_price_id: Mapped[str | None] = mapped_column(
        String(255),
        doc="Stripe Price ID",
    )

    # ─── Relationships ─────────────────────────────────────────────────────────
    
    establishment: Mapped["Establishment"] = relationship(
        "Establishment",
        back_populates="subscription_plans",
    )
    
    items = relationship(
        "SubscriptionPlanItem",
        back_populates="plan",
        cascade="all, delete-orphan",
    )
    
    subscriptions = relationship(
        "Subscription",
        back_populates="plan",
    )

    def __repr__(self) -> str:
        return f"<SubscriptionPlan(id={self.id}, name={self.name}, price={self.price})>"


class SubscriptionPlanItem(BaseModel):
    """
    Subscription plan item.
    
    Defines what services/bundles are included and their quantities.
    """

    __tablename__ = "subscription_plan_items"

    # ─── Foreign Keys ──────────────────────────────────────────────────────────
    
    plan_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("subscription_plans.id"),
        nullable=False,
        index=True,
    )
    
    service_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("services.id"),
        doc="Service included (if single service)",
    )
    
    bundle_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("service_bundles.id"),
        doc="Bundle included (if bundle)",
    )

    # ─── Quantity ──────────────────────────────────────────────────────────────
    
    quantity_per_month: Mapped[int] = mapped_column(
        Integer,
        default=4,
        nullable=False,
        doc="Quantity allowed per month",
    )

    # ─── Relationships ─────────────────────────────────────────────────────────
    
    plan = relationship(
        "SubscriptionPlan",
        back_populates="items",
    )
    
    service: Mapped["Service | None"] = relationship(
        "Service",
        back_populates="subscription_items",
    )
    
    bundle = relationship(
        "ServiceBundle",
    )


class Subscription(BaseModel):
    """
    Subscription model.
    
    Represents a user's active subscription to a plan.
    """

    __tablename__ = "subscriptions"

    # ─── Foreign Keys ──────────────────────────────────────────────────────────
    
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
        doc="Subscriber user ID",
    )
    
    plan_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("subscription_plans.id"),
        nullable=False,
        index=True,
        doc="Subscription plan ID",
    )
    
    establishment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("establishments.id"),
        nullable=False,
        index=True,
        doc="Establishment ID",
    )

    # ─── Status ────────────────────────────────────────────────────────────────
    
    status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus),
        default=SubscriptionStatus.ACTIVE,
        nullable=False,
        index=True,
        doc="Subscription status",
    )

    # ─── Billing Period ────────────────────────────────────────────────────────
    
    current_period_start: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        doc="Current billing period start",
    )
    
    current_period_end: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        doc="Current billing period end",
    )
    
    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        doc="Cancellation timestamp",
    )

    # ─── Stripe ────────────────────────────────────────────────────────────────
    
    stripe_subscription_id: Mapped[str | None] = mapped_column(
        String(255),
        doc="Stripe Subscription ID",
    )

    # ─── Relationships ─────────────────────────────────────────────────────────
    
    user: Mapped["User"] = relationship(
        "User",
        back_populates="subscriptions",
    )
    
    plan: Mapped["SubscriptionPlan"] = relationship(
        "SubscriptionPlan",
        back_populates="subscriptions",
    )
    
    usage = relationship(
        "SubscriptionUsage",
        back_populates="subscription",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Subscription(id={self.id}, status={self.status.value})>"


class SubscriptionUsage(BaseModel):
    """
    Subscription usage tracking.
    
    Tracks how many times each plan item has been used in a period.
    """

    __tablename__ = "subscription_usage"

    # ─── Foreign Keys ──────────────────────────────────────────────────────────
    
    subscription_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("subscriptions.id"),
        nullable=False,
        index=True,
    )
    
    plan_item_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("subscription_plan_items.id"),
        nullable=False,
        index=True,
    )

    # ─── Usage ─────────────────────────────────────────────────────────────────
    
    month_start: Mapped[datetime] = mapped_column(
        Date,
        nullable=False,
        doc="First day of the month",
    )
    
    uses_this_month: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Usage count this month",
    )
    
    last_use_date: Mapped[datetime | None] = mapped_column(
        Date,
        doc="Last usage date",
    )

    # ─── Relationships ─────────────────────────────────────────────────────────
    
    subscription = relationship(
        "Subscription",
        back_populates="usage",
    )
    
    plan_item = relationship(
        "SubscriptionPlanItem",
    )
