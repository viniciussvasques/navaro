"""Favorite schemas."""

from uuid import UUID

from pydantic import BaseModel, ConfigDict


class FavoriteEstablishmentToggle(BaseModel):
    """Schema for toggling a favorite establishment."""

    establishment_id: UUID


class FavoriteStaffToggle(BaseModel):
    """Schema for toggling a favorite staff member."""

    staff_id: UUID
    establishment_id: UUID


class FavoriteEstablishmentResponse(BaseModel):
    """Schema for favorite establishment response."""

    id: UUID
    establishment_id: UUID
    establishment_name: str
    establishment_slug: str
    establishment_logo_url: str | None = None

    model_config = ConfigDict(from_attributes=True)


class FavoriteStaffResponse(BaseModel):
    """Schema for favorite staff response."""

    id: UUID
    staff_id: UUID
    staff_name: str
    establishment_id: UUID
    establishment_name: str

    model_config = ConfigDict(from_attributes=True)


class UserFavoritesResponse(BaseModel):
    """Schema for listing all user favorites."""

    establishments: list[FavoriteEstablishmentResponse]
    staff: list[FavoriteStaffResponse]
