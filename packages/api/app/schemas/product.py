"""Product schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ProductBase(BaseModel):
    """Base product schema."""

    name: str = Field(..., max_length=200)
    description: str | None = Field(None, max_length=1000)
    price: float = Field(..., gt=0)
    stock_quantity: int = Field(0, ge=0)
    active: bool = True
    image_url: str | None = Field(None, max_length=500)


class ProductCreate(ProductBase):
    """Create product schema."""


class ProductUpdate(BaseModel):
    """Update product schema."""

    name: str | None = Field(None, max_length=200)
    description: str | None = Field(None, max_length=1000)
    price: float | None = Field(None, gt=0)
    stock_quantity: int | None = Field(None, ge=0)
    active: bool | None = None
    image_url: str | None = Field(None, max_length=500)


class ProductResponse(ProductBase):
    """Product response schema."""

    id: UUID
    establishment_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
