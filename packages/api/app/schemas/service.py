"""Service schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ServiceBase(BaseModel):
    """Base service schema."""

    name: str = Field(..., max_length=200)
    description: str | None = Field(None, max_length=1000)
    price: float = Field(..., gt=0)
    duration_minutes: int = Field(..., ge=15, le=240)


class ServiceCreate(ServiceBase):
    """Create service schema."""

    staff_ids: list[UUID] = Field(
        default_factory=list,
        description="IDs of staff members who can perform this service",
    )


class ServiceUpdate(BaseModel):
    """Update service schema."""

    name: str | None = Field(None, max_length=200)
    description: str | None = Field(None, max_length=1000)
    price: float | None = Field(None, gt=0)
    duration_minutes: int | None = Field(None, ge=15, le=240)
    active: bool | None = None
    staff_ids: list[UUID] | None = None


class ServiceResponse(BaseModel):
    """Service response schema."""

    id: UUID
    establishment_id: UUID
    name: str
    description: str | None
    price: float
    duration_minutes: int
    active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Service Bundle Schemas ────────────────────────────────────────────────────


class ServiceBundleCreate(BaseModel):
    """Create service bundle schema."""

    name: str = Field(..., max_length=200)
    description: str | None = Field(None, max_length=1000)
    bundle_price: float = Field(..., gt=0)
    service_ids: list[UUID] = Field(..., min_length=1)


class ServiceBundleUpdate(BaseModel):
    """Update service bundle schema."""

    name: str | None = Field(None, max_length=200)
    description: str | None = Field(None, max_length=1000)
    bundle_price: float | None = Field(None, gt=0)
    active: bool | None = None
    service_ids: list[UUID] | None = None


class ServiceBundleResponse(BaseModel):
    """Service bundle response schema."""

    id: UUID
    establishment_id: UUID
    name: str
    description: str | None
    original_price: float
    bundle_price: float
    discount_percent: float | None
    active: bool
    services: list[ServiceResponse]
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Subscription Plan Schemas ─────────────────────────────────────────────────


class SubscriptionPlanItemSchema(BaseModel):
    """Subscription plan item schema."""

    service_id: UUID | None = None
    bundle_id: UUID | None = None
    quantity_per_month: int = Field(4, ge=1)


class SubscriptionPlanCreate(BaseModel):
    """Create subscription plan schema."""

    name: str = Field(..., max_length=200)
    description: str | None = Field(None, max_length=1000)
    price: float = Field(..., gt=0)
    items: list[SubscriptionPlanItemSchema] = Field(..., min_length=1)


class SubscriptionPlanUpdate(BaseModel):
    """Update subscription plan schema."""

    name: str | None = Field(None, max_length=200)
    description: str | None = Field(None, max_length=1000)
    price: float | None = Field(None, gt=0)
    active: bool | None = None


class SubscriptionPlanResponse(BaseModel):
    """Subscription plan response schema."""

    id: UUID
    establishment_id: UUID
    name: str
    description: str | None
    price: float
    active: bool
    stripe_price_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
