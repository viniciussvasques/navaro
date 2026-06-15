"""Search history schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class SearchHistoryCreate(BaseModel):
    """Record a search query."""

    query: str = Field(..., min_length=1, max_length=255)
    establishment_clicked_id: UUID | None = None


class SearchHistoryResponse(BaseModel):
    """Search history entry."""

    id: UUID
    query: str
    establishment_clicked_id: UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}
