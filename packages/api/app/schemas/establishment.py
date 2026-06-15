"""Establishment schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.establishment import (
    EstablishmentCategory,
    EstablishmentStatus,
    SubscriptionTier,
)


class BusinessHours(BaseModel):
    """Business hours for a day."""

    open: str = Field(..., examples=["09:00"])
    close: str = Field(..., examples=["19:00"])
    closed: bool = False


class EstablishmentBase(BaseModel):
    """Base establishment schema."""

    name: str = Field(..., max_length=200)
    category: EstablishmentCategory
    address: str = Field(..., max_length=500)
    city: str = Field(..., max_length=100)
    state: str = Field(..., min_length=2, max_length=2)
    phone: str = Field(..., max_length=20)


class EstablishmentCreate(EstablishmentBase):
    """Create establishment schema."""

    business_hours: dict[str, BusinessHours] = Field(
        default_factory=dict,
        examples=[
            {
                "monday": {"open": "09:00", "close": "19:00", "closed": False},
                "sunday": {"open": "", "close": "", "closed": True},
            }
        ],
    )


class EstablishmentUpdate(BaseModel):
    """Update establishment schema."""

    name: str | None = Field(None, max_length=200)
    address: str | None = Field(None, max_length=500)
    phone: str | None = Field(None, max_length=20)
    latitude: float | None = None
    longitude: float | None = None
    status: EstablishmentStatus | None = None
    logo_url: str | None = None
    cover_url: str | None = None
    business_hours: dict | None = None
    accept_online_payment: bool | None = None
    accept_cash_payment: bool | None = None
    # Bank / PIX data
    pix_key: str | None = None
    pix_key_type: str | None = None
    bank_name: str | None = None
    bank_agency: str | None = None
    bank_account: str | None = None
    bank_account_type: str | None = None
    bank_holder_name: str | None = None
    bank_holder_document: str | None = None
    auto_payout_enabled: bool | None = None


class EstablishmentResponse(BaseModel):
    """Establishment response schema."""

    id: UUID
    owner_id: UUID
    name: str
    slug: str
    category: EstablishmentCategory
    address: str
    city: str
    state: str
    phone: str
    logo_url: str | None
    cover_url: str | None
    business_hours: dict
    distance: float | None = None
    status: EstablishmentStatus
    subscription_tier: SubscriptionTier
    accept_online_payment: bool = True
    accept_cash_payment: bool = True
    pix_key: str | None = None
    pix_key_type: str | None = None
    bank_name: str | None = None
    auto_payout_enabled: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginationMeta(BaseModel):
    """Pagination metadata."""

    page: int
    limit: int
    total: int


class EstablishmentListResponse(BaseModel):
    """Paginated list of establishments."""

    data: list[EstablishmentResponse]
    pagination: PaginationMeta


class TimeSlot(BaseModel):
    """Time slot schema."""

    time: str
    available: bool
    staff_id: UUID | None = None
    staff_name: str | None = None
