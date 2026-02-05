"""Check-in schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.appointment import AppointmentResponse
from app.schemas.subscription import SubscriptionUsageResponse


class QRCodeResponse(BaseModel):
    """QR code response for check-in."""

    qr_token: str
    expires_at: datetime


class CheckinRequest(BaseModel):
    """Check-in request schema."""

    qr_token: str = Field(..., description="JWT token from QR code")


class CheckinResponse(BaseModel):
    """Check-in response schema."""

    success: bool
    appointment: Optional[AppointmentResponse] = None
    subscription_usage: Optional[SubscriptionUsageResponse] = None
    message: Optional[str] = None
