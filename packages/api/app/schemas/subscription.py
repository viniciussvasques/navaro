"""Subscription schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.subscription import SubscriptionStatus


class SubscriptionPlanBase(BaseModel):
    """Base subscription plan schema."""

    name: str = Field(..., max_length=100)
    description: str | None = Field(None, max_length=500)
    price: float = Field(..., gt=0)
    max_uses_per_week: int = Field(..., ge=1, le=30)


class SubscriptionPlanCreate(SubscriptionPlanBase):
    """Create subscription plan schema."""

    service_ids: list[UUID] = Field(
        ...,
        min_length=1,
        description="IDs of services included in this plan",
    )


class SubscriptionPlanResponse(BaseModel):
    """Subscription plan response schema."""

    id: UUID
    establishment_id: UUID
    name: str
    description: str | None
    price: float
    active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class SubscriptionCreate(BaseModel):
    """Subscribe to a plan."""

    plan_id: UUID
    payment_method: str = Field(
        default="wallet",
        description="wallet, mercadopago or stripe",
    )
    payment_method_id: str | None = Field(
        None,
        description="Stripe payment method ID (required when payment_method=stripe)",
    )


class SubscriptionUsageResponse(BaseModel):
    """Subscription usage for current billing period."""

    uses_this_month: int
    max_uses_per_month: int
    period_start: datetime
    period_end: datetime


class SubscriptionResponse(BaseModel):
    """Subscription response schema."""

    id: UUID
    user_id: UUID
    plan_id: UUID
    establishment_id: UUID
    status: SubscriptionStatus
    current_period_start: datetime
    current_period_end: datetime
    created_at: datetime
    cancelled_at: datetime | None
    plan: SubscriptionPlanResponse | None = None
    usage: SubscriptionUsageResponse | None = None

    model_config = {"from_attributes": True}


class SubscriberSummaryResponse(BaseModel):
    """Owner view of an active subscriber."""

    subscription_id: UUID
    user_id: UUID
    user_name: str | None
    plan_name: str
    status: SubscriptionStatus
    current_period_end: datetime
    uses_this_month: int
    max_uses_per_month: int

    model_config = {"from_attributes": True}
