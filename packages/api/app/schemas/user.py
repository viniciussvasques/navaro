"""User schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole


class UserBase(BaseModel):
    """Base user schema."""

    name: str | None = Field(None, max_length=200)
    email: EmailStr | None = None


class UserUpdate(UserBase):
    """Update user schema."""

    avatar_url: str | None = None


class UserResponse(BaseModel):
    """User response schema."""

    id: UUID
    phone: str
    name: str | None
    email: str | None
    avatar_url: str | None
    role: UserRole
    created_at: datetime

    model_config = {"from_attributes": True}
