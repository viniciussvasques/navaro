"""Portfolio schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PortfolioImageCreate(BaseModel):
    """Schema for adding a portfolio image."""

    establishment_id: UUID
    staff_id: UUID | None = None
    image_url: str
    thumbnail_url: str | None = None
    description: str | None = None


class PortfolioImageResponse(BaseModel):
    """Schema for a portfolio image response."""

    id: UUID
    establishment_id: UUID
    staff_id: UUID | None = None
    image_url: str
    thumbnail_url: str | None = None
    description: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PortfolioListResponse(BaseModel):
    """Schema for listing portfolio images."""

    items: list[PortfolioImageResponse]
    total: int
    page: int
    page_size: int
