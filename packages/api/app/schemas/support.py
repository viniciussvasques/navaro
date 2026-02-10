"""Support schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.support import TicketCategory, TicketPriority, TicketStatus
from app.schemas.user import UserResponse


class TicketMessageBase(BaseModel):
    """Base ticket message schema."""

    content: str
    attachments: list[str] = Field(default_factory=list)


class TicketMessageCreate(TicketMessageBase):
    """Schema for creating a message."""

    pass


class TicketMessageResponse(TicketMessageBase):
    """Schema for message response."""

    id: UUID
    ticket_id: UUID
    sender_id: UUID
    read_at: datetime | None
    created_at: datetime
    updated_at: datetime
    sender: UserResponse

    model_config = ConfigDict(from_attributes=True)


class TicketBase(BaseModel):
    """Base ticket schema."""

    title: str
    priority: TicketPriority = TicketPriority.medium
    category: TicketCategory = TicketCategory.general


class TicketCreate(TicketBase):
    """Schema for creating a ticket."""

    pass


class TicketUpdate(BaseModel):
    """Schema for updating a ticket."""

    status: TicketStatus | None = None
    priority: TicketPriority | None = None
    assigned_to_id: UUID | None = None


class TicketResponseSimple(TicketBase):
    """Schema for ticket response without messages (for lists)."""

    id: UUID
    user_id: UUID
    assigned_to_id: UUID | None
    status: TicketStatus
    created_at: datetime
    updated_at: datetime
    user: UserResponse
    assigned_to: UserResponse | None
    queue_position: int | None = None
    estimated_wait_time_minutes: int | None = None

    model_config = ConfigDict(from_attributes=True)


class TicketResponse(TicketResponseSimple):
    """Schema for ticket response with messages."""

    # Optional list of messages if requested
    messages: list[TicketMessageResponse] | None = None


class TicketListResponse(BaseModel):
    """Schema for ticket list response."""

    items: list[TicketResponseSimple]
    total: int
    page: int
    page_size: int

class SupportContextAppointment(BaseModel):
    id: UUID
    service_name: str
    staff_name: str
    status: str
    start_at: datetime

class SupportContextPayment(BaseModel):
    id: UUID
    amount: float
    status: str
    provider: str
    created_at: datetime

class UserSupportContext(BaseModel):
    """Schema for unified support context for a user."""
    user: UserResponse
    recent_appointments: list[SupportContextAppointment]
    recent_payments: list[SupportContextPayment]
    total_spent: float
    subscription_tier: str | None = None

class CancelAppointmentRequest(BaseModel):
    reason: str
