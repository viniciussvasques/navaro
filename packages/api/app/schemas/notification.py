"""Notification schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.notification import NotificationType


class NotificationBase(BaseModel):
    """Base schema for notification."""

    title: str
    message: str
    type: NotificationType
    data: dict | None = {}


class NotificationUpdate(BaseModel):
    """Schema for updating a notification (e.g. marking as read)."""

    is_read: bool


class NotificationResponse(NotificationBase):
    """Schema for notification response."""

    id: UUID
    user_id: UUID
    is_read: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationListResponse(BaseModel):
    """Schema for listing notifications."""

    items: list[NotificationResponse]
    total: int
    page: int
    page_size: int
    unread_count: int
