"""Notification endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.notification import (
    NotificationListResponse,
    NotificationResponse,
)
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """List current user notifications."""
    service = NotificationService(db)
    skip = (page - 1) * page_size
    items, total, unread = await service.list_user_notifications(current_user.id, skip, page_size)
    return NotificationListResponse(
        items=items, total=total, page=page, page_size=page_size, unread_count=unread
    )


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Mark a specific notification as read."""
    service = NotificationService(db)
    return await service.mark_read(current_user.id, notification_id)


@router.patch("/read-all", status_code=status.HTTP_200_OK)
async def mark_all_notifications_read(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Mark all notifications of the current user as read."""
    service = NotificationService(db)
    count = await service.mark_all_read(current_user.id)
    return {"message": f"{count} notificações marcadas como lidas."}
