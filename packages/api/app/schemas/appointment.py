"""Appointment schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.appointment import AppointmentStatus, PaymentMethod, PaymentType


class AppointmentProductCreate(BaseModel):
    """Product added to appointment."""

    product_id: UUID
    quantity: int = Field(1, ge=1)


class AppointmentCreate(BaseModel):
    """Create appointment schema."""

    establishment_id: UUID
    service_id: UUID
    staff_id: UUID
    scheduled_at: datetime
    payment_type: PaymentType = PaymentType.single  # Default: pagamento único
    payment_method: PaymentMethod = PaymentMethod.card
    products: list[AppointmentProductCreate] | None = None


class AppointmentUpdate(BaseModel):
    """Update appointment schema."""

    status: AppointmentStatus | None = None
    products: list[AppointmentProductCreate] | None = None
    cancel_reason: str | None = Field(None, max_length=500)


class AppointmentProductResponse(BaseModel):
    """Product in appointment response."""

    product_id: UUID
    name: str
    quantity: int
    unit_price: float

    model_config = {"from_attributes": True}


class AppointmentResponse(BaseModel):
    """Appointment response schema."""

    id: UUID
    user_id: UUID
    establishment_id: UUID
    service_id: UUID
    staff_id: UUID
    subscription_id: UUID | None
    scheduled_at: datetime
    duration_minutes: int
    status: AppointmentStatus
    payment_type: PaymentType
    payment_method: PaymentMethod
    total_price: float | None
    products: list[AppointmentProductResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}
