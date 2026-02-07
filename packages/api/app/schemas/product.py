"""Product schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ProductBase(BaseModel):
    """Base product schema."""

    name: str = Field(..., max_length=200)
    description: str | None = Field(None, max_length=1000)
    price: float = Field(..., gt=0)
    cost_price: float | None = Field(None, ge=0)
    markup_percentage: float | None = Field(None, ge=0)
    stock_quantity: int = Field(0, ge=0)
    active: bool = True
    image_url: str | None = Field(None, max_length=500)


class ProductCreate(ProductBase):
    """Create product schema."""

    # Overwrite price to be optional because it can be calculated
    price: float | None = Field(None, gt=0)


class ProductUpdate(BaseModel):
    """Update product schema."""

    name: str | None = Field(None, max_length=200)
    description: str | None = Field(None, max_length=1000)
    price: float | None = Field(None, gt=0)
    cost_price: float | None = Field(None, ge=0)
    markup_percentage: float | None = Field(None, ge=0)
    stock_quantity: int | None = Field(None, ge=0)
    active: bool | None = None
    image_url: str | None = Field(None, max_length=500)


class ProductResponse(ProductBase):
    """Product response schema."""

    id: UUID
    establishment_id: UUID
    profit_margin: float | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
