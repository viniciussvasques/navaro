"""Notification model."""

import enum
from uuid import UUID

from sqlalchemy import JSON, Boolean, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class NotificationType(str, enum.Enum):
    """Types of notifications."""

    appointment = "appointment"
    checkin = "checkin"
    queue = "queue"
    system = "system"


class Notification(BaseModel):
    """
    Notification model.

    Represents an in-app notification for a user.
    """

    __tablename__ = "notifications"

    # ─── Foreign Keys ──────────────────────────────────────────────────────────

    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
        doc="Recipient user ID",
    )

    # ─── Content ───────────────────────────────────────────────────────────────

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        doc="Notification title",
    )

    message: Mapped[str] = mapped_column(
        String(1000),
        nullable=False,
        doc="Notification message",
    )

    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType),
        default=NotificationType.system,
        nullable=False,
        index=True,
        doc="Notification type",
    )

    is_read: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True,
        doc="Whether notification has been read",
    )

    data: Mapped[dict] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
        doc="Additional metadata for the notification",
    )

    # ─── Relationships ─────────────────────────────────────────────────────────

    user = relationship("User", backref="notifications_list")

    def __repr__(self) -> str:
        return f"<Notification(id={self.id}, type={self.type}, is_read={self.is_read})>"
