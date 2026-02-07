"""Staff schemas."""

from datetime import datetime
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
    phone: str | None = Field(None, max_length=20)
    role: str = Field(..., max_length=100, examples=["barbeiro", "cabeleireiro"])
    bio: str | None = Field(None, max_length=1000)


class StaffCreate(StaffBase):
    """Create staff schema."""

    work_schedule: dict[str, WorkSchedule] = Field(default_factory=dict)
    commission_rate: float | None = Field(None, ge=0, le=100)


class StaffUpdate(BaseModel):
    """Update staff schema."""

    name: str | None = Field(None, max_length=200)
    phone: str | None = Field(None, max_length=20)
    role: str | None = Field(None, max_length=100)
    bio: str | None = Field(None, max_length=1000)
    avatar_url: str | None = None
    work_schedule: dict | None = None
    commission_rate: float | None = Field(None, ge=0, le=100)
    active: bool | None = None


class StaffResponse(BaseModel):
    """Staff response schema."""

    id: UUID
    establishment_id: UUID
    name: str
    phone: str | None
    role: str
    bio: str | None
    avatar_url: str | None
    work_schedule: dict
    commission_rate: float | None
    active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class StaffBlockCreate(BaseModel):
    """Create staff block schema."""

    start_at: datetime
    end_at: datetime
    reason: str | None = Field(None, max_length=200)


class StaffBlockResponse(BaseModel):
    """Staff block response schema."""

    id: UUID
    staff_id: UUID
    start_at: datetime
    end_at: datetime
    reason: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
