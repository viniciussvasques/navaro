"""Staff schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class WorkSchedule(BaseModel):
    """Work schedule for a day."""

    start: str = Field(..., examples=["09:00"])
    end: str = Field(..., examples=["18:00"])
    off: bool = False


class StaffBase(BaseModel):
    """Base staff schema."""

    name: str = Field(..., max_length=200)
    phone: Optional[str] = Field(None, max_length=20)
    role: str = Field(..., max_length=100, examples=["barbeiro", "cabeleireiro"])


class StaffCreate(StaffBase):
    """Create staff schema."""

    work_schedule: dict[str, WorkSchedule] = Field(default_factory=dict)
    commission_rate: Optional[float] = Field(None, ge=0, le=100)


class StaffUpdate(BaseModel):
    """Update staff schema."""

    name: Optional[str] = Field(None, max_length=200)
    phone: Optional[str] = Field(None, max_length=20)
    role: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[str] = None
    work_schedule: Optional[dict] = None
    commission_rate: Optional[float] = Field(None, ge=0, le=100)
    active: Optional[bool] = None


class StaffResponse(BaseModel):
    """Staff response schema."""

    id: UUID
    establishment_id: UUID
    name: str
    phone: Optional[str]
    role: str
    avatar_url: Optional[str]
    work_schedule: dict
    commission_rate: Optional[float]
    active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
