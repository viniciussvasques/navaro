"""Subscription schemas."""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.subscription import SubscriptionStatus


class SubscriptionPlanBase(BaseModel):
    """Base subscription plan schema."""

    name: str = Field(..., max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    price: float = Field(..., gt=0)
    max_uses_per_week: int = Field(..., ge=1, le=30)


class SubscriptionPlanCreate(SubscriptionPlanBase):
    """Create subscription plan schema."""

    service_ids: List[UUID] = Field(
        ...,
        min_length=1,
        description="IDs of services included in this plan",
    )


class SubscriptionPlanResponse(BaseModel):
    """Subscription plan response schema."""

    id: UUID
    establishment_id: UUID
    name: str
    description: Optional[str]
    price: float
    max_uses_per_week: int
    max_uses_per_day: int
    active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class SubscriptionCreate(BaseModel):
    """Create subscription schema."""

    plan_id: UUID
    payment_method_id: str = Field(
        ...,
        description="Stripe payment method ID",
    )


class SubscriptionUsageResponse(BaseModel):
    """Subscription usage response."""

    uses_this_week: int
    max_uses_per_week: int
    uses_today: int
    max_uses_per_day: int


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
    cancelled_at: Optional[datetime]
    plan: Optional[SubscriptionPlanResponse] = None
    usage: Optional[SubscriptionUsageResponse] = None

    model_config = {"from_attributes": True}
