"""Service schemas."""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field


class ServiceBase(BaseModel):
    """Base service schema."""

    name: str = Field(..., max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    price: float = Field(..., gt=0)
    duration_minutes: int = Field(..., ge=15, le=240)


class ServiceCreate(ServiceBase):
    """Create service schema."""

    staff_ids: List[UUID] = Field(
        default_factory=list,
        description="IDs of staff members who can perform this service",
    )


class ServiceUpdate(BaseModel):
    """Update service schema."""

    name: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    price: Optional[float] = Field(None, gt=0)
    duration_minutes: Optional[int] = Field(None, ge=15, le=240)
    active: Optional[bool] = None
    staff_ids: Optional[List[UUID]] = None


class ServiceResponse(BaseModel):
    """Service response schema."""

    id: UUID
    establishment_id: UUID
    name: str
    description: Optional[str]
    price: float
    duration_minutes: int
    active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
