"""Check-in schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class QRCodeResponse(BaseModel):
    """QR code response for check-in."""

    qr_token: str
    qr_image_base64: str
    expires_at: datetime


class CheckinRequest(BaseModel):
    """Check-in request schema."""

    qr_token: str = Field(..., description="JWT token from QR code")


class CheckinResponse(BaseModel):
    """Check-in response schema."""

    success: bool
    establishment_id: UUID | None = None
    appointment_id: UUID | None = None
    queue_position: int | None = None
    message: str | None = None
