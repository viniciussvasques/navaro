"""Review schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class ReviewCreate(BaseModel):
    """Schema for creating a review."""

    establishment_id: UUID
    appointment_id: UUID | None = None
    staff_id: UUID | None = None
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    comment: str | None = Field(None, max_length=1000)

    @field_validator("rating")
    def rating_must_be_valid(cls, v):
        if not 1 <= v <= 5:
            raise ValueError("Rating must be between 1 and 5")
        return v


class ReviewUpdate(BaseModel):
    """Schema for updating a review."""

    rating: int | None = Field(None, ge=1, le=5)
    comment: str | None = Field(None, max_length=1000)

    @field_validator("rating")
    def rating_must_be_valid(cls, v):
        if v is not None and not 1 <= v <= 5:
            raise ValueError("Rating must be between 1 and 5")
        return v


class ReviewOwnerResponse(BaseModel):
    """Schema for owner response."""

    response: str = Field(..., min_length=1, max_length=1000)


class ReviewResponse(BaseModel):
    """Schema for review response."""

    id: UUID
    user_id: UUID
    establishment_id: UUID
    appointment_id: UUID | None
    staff_id: UUID | None
    rating: int
    comment: str | None
    created_at: datetime
    updated_at: datetime

    # Owner response
    owner_response: str | None
    owner_responded_at: datetime | None

    # Extra fields
    user_name: str | None = None

    model_config = {"from_attributes": True}


class ReviewListResponse(BaseModel):
    """Schema for list of reviews."""

    items: list[ReviewResponse]
    total: int
    page: int
    page_size: int
