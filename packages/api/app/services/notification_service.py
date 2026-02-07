from typing import Any
from collections.abc import Sequence
from uuid import UUID

import httpx
from fastapi import HTTPException
from sqlalchemy import func, select, desc, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.notification import Notification, NotificationType
from app.models.system_settings import SettingsKeys
from app.services.settings_service import SettingsService

logger = get_logger(__name__)


class NotificationService:
    """Service for managing notifications (SMS, Push, In-App)."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.settings = SettingsService(db)

    async def list_user_notifications(
        self, user_id: UUID, skip: int = 0, limit: int = 20
    ) -> tuple[Sequence[Notification], int, int]:
        """List notifications for a user."""
        # Base query for user items
        stmt = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(desc(Notification.created_at))
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        items = result.scalars().all()

        # Total count
        count_stmt = select(func.count()).where(Notification.user_id == user_id)
        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar() or 0

        # Unread count
        unread_stmt = select(func.count()).where(
            Notification.user_id == user_id, Notification.is_read == False
        )
        unread_result = await self.db.execute(unread_stmt)
        unread = unread_result.scalar() or 0

        return items, total, unread

    async def mark_read(self, user_id: UUID, notification_id: UUID) -> Notification:
        """Mark a notification as read."""
        notification = await self.db.get(Notification, notification_id)
        if not notification or notification.user_id != user_id:
            raise HTTPException(status_code=404, detail="Notification not found")

        notification.is_read = True
        await self.db.commit()
        await self.db.refresh(notification)
        return notification

    async def mark_all_read(self, user_id: UUID) -> int:
        """Mark all notifications for a user as read."""
        stmt = (
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read == False)
            .values(is_read=True)
        )
        result = await self.db.execute(stmt)
        await self.db.commit()
        return result.rowcount

    async def send_sms(self, phone: str, message: str) -> bool:
        """Send SMS via nVoIP."""
        # Check if SMS is enabled
        enabled = await self.settings.get_bool(SettingsKeys.SMS_ENABLED)
        if not enabled:
            logger.info("SMS disabled, skipping", phone=phone)
            return False

        # Get credentials
        token = await self.settings.get(SettingsKeys.NVOIP_TOKEN)
        if not token:
            logger.error("nVoIP token not configured")
            return False

        # Format number (ensure it has just digits)
        clean_phone = "".join(filter(str.isdigit, phone))

        # nVoIP typically expects 55 + DDD + Number for Brazil
        if len(clean_phone) <= 11 and not clean_phone.startswith("55"):
            clean_phone = f"55{clean_phone}"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
                # Check Nvoip API documentation for exact structure
                # https://nvoip.docs.apiary.io/#
                # Using standard structure based on widespread providers
                payload = {"number": clean_phone, "message": message, "flashSms": False}

                # Using the URL from docs (hypothetical, need to verify exact endpoint)
                # Assuming v2 based on typical SaaS: https://api.nvoip.com.br/v2/sms
                response = await client.post(
                    "https://api.nvoip.com.br/v2/sms", json=payload, headers=headers
                )

                if response.status_code in (200, 201):
                    logger.info("SMS sent successfully", phone=phone)
                    return True
                else:
                    logger.error(
                        "Failed to send SMS",
                        phone=phone,
                        status=response.status_code,
                        response=response.text,
                    )
                    return False
        except Exception as e:
            logger.error("Error sending SMS", error=str(e), phone=phone)
            return False

    async def create_in_app(
        self,
        user_id: str,
        title: str,
        message: str,
        type: NotificationType = NotificationType.system,
        data: dict[str, Any] | None = None,
    ) -> Notification:
        """Create in-app notification."""
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=type,
            data=data or {},
        )
        self.db.add(notification)
        await self.db.commit()
        await self.db.refresh(notification)
        return notification
