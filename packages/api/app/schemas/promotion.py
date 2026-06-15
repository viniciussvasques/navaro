"""Promotion and ad campaign schemas."""

from datetime import date, datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class PromotionCreate(BaseModel):
    title: str = Field(..., max_length=200)
    description: str | None = None
    discount_percent: float | None = Field(None, ge=0, le=100)
    discount_fixed: float | None = Field(None, ge=0)
    starts_at: datetime
    ends_at: datetime


class PromotionUpdate(BaseModel):
    title: str | None = Field(None, max_length=200)
    description: str | None = None
    discount_percent: float | None = Field(None, ge=0, le=100)
    discount_fixed: float | None = Field(None, ge=0)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    active: bool | None = None


class PromotionResponse(BaseModel):
    id: UUID
    establishment_id: UUID
    title: str
    description: str | None
    discount_percent: float | None
    discount_fixed: float | None
    starts_at: datetime
    ends_at: datetime
    active: bool
    notify_sent: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AdPlacementEnum(StrEnum):
    search_top = "search_top"
    search_list = "search_list"
    map_pin = "map_pin"


class AudienceConfig(BaseModel):
    """Target audience filters (optional — empty = all)."""

    gender: str | None = Field(None, description="all | male | female")
    age_min: int | None = Field(None, ge=0, le=120)
    age_max: int | None = Field(None, ge=0, le=120)
    new_customers_only: bool = False
    categories: list[str] = Field(default_factory=list)


class AdCampaignCreate(BaseModel):
    name: str | None = Field(None, max_length=200)
    budget_daily: float = Field(..., gt=0, description="Orçamento diário em R$")
    budget_total: float | None = Field(None, gt=0, description="Teto total opcional")
    start_date: date
    end_date: date | None = None
    active: bool = True
    placement: AdPlacementEnum = AdPlacementEnum.search_top
    priority: int = Field(0, ge=0, le=100, description="Maior = melhor posição")
    target_radius_km: float = Field(15, ge=1, le=100, description="Raio de cobertura (km)")
    target_center_lat: float | None = None
    target_center_lng: float | None = None
    target_cities: list[str] = Field(default_factory=list)
    audience: AudienceConfig = Field(default_factory=AudienceConfig)
    cost_per_impression: float = Field(0.05, gt=0, le=10)

    @field_validator("target_cities", mode="before")
    @classmethod
    def strip_cities(cls, v):
        if not v:
            return []
        return [c.strip() for c in v if c and str(c).strip()]


class AdCampaignUpdate(BaseModel):
    name: str | None = None
    budget_daily: float | None = Field(None, gt=0)
    budget_total: float | None = Field(None, gt=0)
    start_date: date | None = None
    end_date: date | None = None
    active: bool | None = None
    placement: AdPlacementEnum | None = None
    priority: int | None = Field(None, ge=0, le=100)
    target_radius_km: float | None = Field(None, ge=1, le=100)
    target_center_lat: float | None = None
    target_center_lng: float | None = None
    target_cities: list[str] | None = None
    audience: AudienceConfig | None = None
    cost_per_impression: float | None = Field(None, gt=0, le=10)
    status: str | None = None


class AdCampaignResponse(BaseModel):
    id: UUID
    establishment_id: UUID
    name: str | None
    budget_daily: float
    budget_total: float | None
    spent_today: float
    total_spent: float
    impressions: int
    clicks: int
    start_date: date
    end_date: date | None
    active: bool
    placement: str
    priority: int
    target_radius_km: float
    target_center_lat: float | None
    target_center_lng: float | None
    target_cities: list[str]
    audience_config: dict
    cost_per_impression: float
    status: str
    created_at: datetime
    budget_remaining_today: float | None = None
    budget_remaining_total: float | None = None

    model_config = {"from_attributes": True}


class AdCampaignSummary(BaseModel):
    """Dashboard stats for owner."""

    active_campaigns: int
    total_impressions: int
    total_clicks: int
    total_spent: float
    is_sponsored: bool
    campaigns: list[AdCampaignResponse]


class MonetizationSummaryResponse(BaseModel):
    subscription_tier: str
    commission_percent: float
    pending_platform_fees: float
    is_sponsored: bool
    platform_subscription_expires_at: datetime | None = None
    platform_saas_monthly_price: float = 29.99
    is_platform_subscription_active: bool = True
    platform_auto_renew: bool = False


class PlatformSubscriptionPayResponse(BaseModel):
    amount_paid: float
    platform_subscription_expires_at: datetime
    subscription_tier: str


class PlatformSaasPayIntentRequest(BaseModel):
    provider: str = "mercadopago"


class PlatformAutoRenewUpdate(BaseModel):
    enabled: bool
