"""QR Scan tracking model."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class QRScan(BaseModel):
    """Track QR code scans per establishment.

    Used to measure how many people scanned the establishment QR,
    whether they converted (installed the app / became a user),
    and which source/campaign originated the scan.
    """

    __tablename__ = "qr_scans"

    establishment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("establishments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="The establishment whose QR was scanned",
    )

    # Optional - set after user signs up
    user_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="The user who scanned (set after signup/login)",
    )

    # Scan metadata
    user_agent: Mapped[str | None] = mapped_column(
        Text, nullable=True, doc="Browser / device user agent"
    )
    ip_address: Mapped[str | None] = mapped_column(
        String(45), nullable=True, doc="IP address of the scanner"
    )
    platform: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        doc="Detected platform: android, ios, web, unknown",
    )
    source: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        default="poster",
        doc="Campaign source: poster, card, flyer, etc.",
    )

    # Conversion tracking
    converted_to_user: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        doc="Whether this scan led to a new user signup",
    )
    converted_to_favorite: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        doc="Whether the user favorited the establishment",
    )
    converted_to_appointment: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        doc="Whether the user booked an appointment",
    )

    scanned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="When the scan occurred",
    )

    # Relationships
    establishment = relationship("Establishment", lazy="selectin")
    user = relationship("User", lazy="selectin")
