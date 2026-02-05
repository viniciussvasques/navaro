"""Queue schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.models.queue import QueueStatus


class QueueEntryCreate(BaseModel):
    """Schema for joining the queue."""

    establishment_id: UUID
    service_id: UUID | None = None
    preferred_staff_id: UUID | None = None


class QueueStatusUpdate(BaseModel):
    """Schema for updating queue status."""

    status: QueueStatus
    assigned_staff_id: UUID | None = None


class QueueEntryResponse(BaseModel):
    """Schema for queue entry response."""

    id: UUID
    establishment_id: UUID
    user_id: UUID
    service_id: UUID | None
    preferred_staff_id: UUID | None
    assigned_staff_id: UUID | None
    position: int
    status: QueueStatus
    entered_at: datetime
    called_at: datetime | None
    started_at: datetime | None
    completed_at: datetime | None

    # Extra fields for display
    user_name: str | None = None
    service_name: str | None = None
    staff_name: str | None = None
    estimated_wait_minutes: int | None = None

    model_config = {"from_attributes": True}


class QueueListResponse(BaseModel):
    """Schema for list of queue entries."""

    items: list[QueueEntryResponse]
    total_waiting: int
    current_serving: int
