"""User schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole


class UserBase(BaseModel):
    """Base user schema."""

    name: Optional[str] = Field(None, max_length=200)
    email: Optional[EmailStr] = None


class UserUpdate(UserBase):
    """Update user schema."""

    avatar_url: Optional[str] = None


class UserResponse(BaseModel):
    """User response schema."""

    id: UUID
    phone: str
    name: Optional[str]
    email: Optional[str]
    avatar_url: Optional[str]
    role: UserRole
    created_at: datetime

    model_config = {"from_attributes": True}
