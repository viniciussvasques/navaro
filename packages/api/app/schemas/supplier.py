"""Supplier schemas (B2B marketplace)."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.supplier import (
    SupplierOrderStatus,
    SupplierProductUnit,
    SupplierSegment,
)


# ─── Supplier ──────────────────────────────────────────────────────────────────


class SupplierCreate(BaseModel):
    name: str = Field(..., max_length=200)
    cnpj: str | None = Field(None, max_length=18)
    description: str | None = None
    segment: SupplierSegment = SupplierSegment.other
    phone: str | None = Field(None, max_length=20)
    whatsapp: str | None = Field(None, max_length=20)
    email: str | None = Field(None, max_length=255)
    website: str | None = Field(None, max_length=500)
    city: str | None = Field(None, max_length=100)
    state: str | None = Field(None, max_length=2)
    ships_nationwide: bool = True


class SupplierUpdate(BaseModel):
    name: str | None = Field(None, max_length=200)
    cnpj: str | None = Field(None, max_length=18)
    description: str | None = None
    segment: SupplierSegment | None = None
    phone: str | None = None
    whatsapp: str | None = None
    email: str | None = None
    website: str | None = None
    city: str | None = None
    state: str | None = None
    ships_nationwide: bool | None = None
    logo_url: str | None = None
    active: bool | None = None


class SupplierResponse(BaseModel):
    id: UUID
    owner_user_id: UUID
    name: str
    cnpj: str | None
    logo_url: str | None
    description: str | None
    segment: str
    phone: str | None
    whatsapp: str | None
    email: str | None
    website: str | None
    city: str | None
    state: str | None
    ships_nationwide: bool
    active: bool
    verified: bool
    rating: Decimal | None
    total_reviews: int
    total_orders: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SupplierPublicResponse(BaseModel):
    """Public-facing supplier data (no internal PII like owner_user_id)."""

    id: UUID
    name: str
    logo_url: str | None
    description: str | None
    segment: str
    phone: str | None
    whatsapp: str | None
    email: str | None
    website: str | None
    city: str | None
    state: str | None
    ships_nationwide: bool
    verified: bool
    rating: Decimal | None
    total_reviews: int
    total_orders: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SupplierListResponse(BaseModel):
    items: list[SupplierPublicResponse]
    total: int
    page: int
    page_size: int


# ─── Supplier Product ──────────────────────────────────────────────────────────


class SupplierProductCreate(BaseModel):
    name: str = Field(..., max_length=200)
    description: str | None = None
    sku: str | None = Field(None, max_length=100)
    unit: SupplierProductUnit = SupplierProductUnit.unit
    price: Decimal = Field(..., gt=0)
    moq: int = Field(1, ge=1)
    active: bool = True
    sort_order: int = 0


class SupplierProductUpdate(BaseModel):
    name: str | None = Field(None, max_length=200)
    description: str | None = None
    sku: str | None = None
    unit: SupplierProductUnit | None = None
    price: Decimal | None = Field(None, gt=0)
    moq: int | None = Field(None, ge=1)
    image_url: str | None = None
    active: bool | None = None
    sort_order: int | None = None


class SupplierProductResponse(BaseModel):
    id: UUID
    supplier_id: UUID
    name: str
    description: str | None
    sku: str | None
    image_url: str | None
    unit: str
    price: Decimal
    moq: int
    active: bool
    sort_order: int
    stock_qty: int | None = None

    model_config = ConfigDict(from_attributes=True)


# ─── Supplier Stock ─────────────────────────────────────────────────────────────


class SupplierStockUpdate(BaseModel):
    quantity: int = Field(..., ge=0)
    min_threshold: int = Field(5, ge=0)


class SupplierStockResponse(BaseModel):
    product_id: UUID
    quantity: int
    min_threshold: int

    model_config = ConfigDict(from_attributes=True)


# ─── Supplier Order ────────────────────────────────────────────────────────────


class OrderItemCreate(BaseModel):
    product_id: UUID
    quantity: int = Field(..., ge=1)


class SupplierOrderCreate(BaseModel):
    supplier_id: UUID
    items: list[OrderItemCreate] = Field(..., min_length=1)
    notes: str | None = None


class SupplierOrderStatusUpdate(BaseModel):
    status: SupplierOrderStatus
    tracking_code: str | None = None


class OrderItemResponse(BaseModel):
    id: UUID
    product_id: UUID
    quantity: int
    unit_price: Decimal
    subtotal: Decimal
    product_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


class SupplierOrderResponse(BaseModel):
    id: UUID
    supplier_id: UUID
    establishment_id: UUID
    status: str
    total: Decimal
    notes: str | None
    tracking_code: str | None
    created_at: datetime
    items: list[OrderItemResponse] = []
    supplier_name: str | None = None
    establishment_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


class SupplierOrderListResponse(BaseModel):
    items: list[SupplierOrderResponse]
    total: int
    page: int
    page_size: int


# ─── Supplier Promotion ────────────────────────────────────────────────────────


class SupplierPromotionCreate(BaseModel):
    title: str = Field(..., max_length=200)
    description: str | None = None
    discount_percent: Decimal | None = Field(None, ge=0, le=100)
    starts_at: datetime
    ends_at: datetime


class SupplierPromotionUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    discount_percent: Decimal | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    active: bool | None = None


class SupplierPromotionResponse(BaseModel):
    id: UUID
    supplier_id: UUID
    title: str
    description: str | None
    discount_percent: Decimal | None
    starts_at: datetime
    ends_at: datetime
    active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ─── Supplier Review ──────────────────────────────────────────────────────────


class SupplierReviewCreate(BaseModel):
    supplier_id: UUID
    order_id: UUID | None = None
    rating: int = Field(..., ge=1, le=5)
    comment: str | None = None


class SupplierReviewRespond(BaseModel):
    response: str = Field(..., max_length=1000)


class SupplierReviewResponse(BaseModel):
    id: UUID
    supplier_id: UUID
    establishment_id: UUID
    order_id: UUID | None
    rating: int
    comment: str | None
    owner_response: str | None
    created_at: datetime
    establishment_name: str | None = None

    model_config = ConfigDict(from_attributes=True)
