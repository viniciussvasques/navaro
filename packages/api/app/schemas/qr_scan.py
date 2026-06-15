"""QR Scan schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class QRScanCreate(BaseModel):
    """Register a QR scan."""

    source: str | None = Field("poster", max_length=50, description="poster, card, flyer, etc.")


class QRScanResponse(BaseModel):
    """Single scan record."""

    id: UUID
    establishment_id: UUID
    user_id: UUID | None = None
    platform: str | None = None
    source: str | None = None
    converted_to_user: bool = False
    converted_to_favorite: bool = False
    converted_to_appointment: bool = False
    scanned_at: datetime


class QRAnalytics(BaseModel):
    """Analytics summary for an establishment."""

    establishment_id: UUID
    establishment_name: str
    establishment_slug: str
    total_scans: int = 0
    unique_users: int = 0
    conversions_signup: int = 0
    conversions_favorite: int = 0
    conversions_appointment: int = 0
    conversion_rate: float = 0.0
    scans_today: int = 0
    scans_this_week: int = 0
    scans_this_month: int = 0
    platform_breakdown: dict = Field(default_factory=dict)
    source_breakdown: dict = Field(default_factory=dict)


class QRCodeResponse(BaseModel):
    """Generated QR code for establishment."""

    establishment_id: UUID
    establishment_name: str
    slug: str
    qr_url: str
    smart_link: str


class AdminQRAnalyticsSummary(BaseModel):
    """Admin-level analytics across all establishments."""

    total_scans: int = 0
    total_conversions_signup: int = 0
    total_conversions_favorite: int = 0
    total_conversions_appointment: int = 0
    overall_conversion_rate: float = 0.0
    top_establishments: list[QRAnalytics] = []
