"""Appointment schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.appointment import AppointmentStatus, PaymentType


class AppointmentCreate(BaseModel):
    """Create appointment schema."""

    establishment_id: UUID
    service_id: UUID
    staff_id: UUID
    scheduled_at: datetime
    payment_type: PaymentType


class AppointmentUpdate(BaseModel):
    """Update appointment schema."""

    status: Optional[AppointmentStatus] = None


class AppointmentResponse(BaseModel):
    """Appointment response schema."""

    id: UUID
    user_id: UUID
    establishment_id: UUID
    service_id: UUID
    staff_id: UUID
    subscription_id: Optional[UUID]
    scheduled_at: datetime
    duration_minutes: int
    status: AppointmentStatus
    payment_type: PaymentType
    created_at: datetime

    model_config = {"from_attributes": True}
