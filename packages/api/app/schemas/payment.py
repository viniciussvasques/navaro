"""Payment schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.payment import PaymentStatus, PaymentPurpose


class CreatePaymentIntentRequest(BaseModel):
    """Request to create payment intent."""

    appointment_id: UUID


class CreatePaymentIntentResponse(BaseModel):
    """Payment intent response."""

    client_secret: str
    amount: float


class PaymentResponse(BaseModel):
    """Payment response schema."""

    id: UUID
    user_id: UUID
    establishment_id: UUID
    appointment_id: Optional[UUID]
    subscription_id: Optional[UUID]
    purpose: PaymentPurpose
    amount: float
    platform_fee: float
    gateway_fee: float
    net_amount: float
    status: PaymentStatus
    created_at: datetime

    model_config = {"from_attributes": True}
