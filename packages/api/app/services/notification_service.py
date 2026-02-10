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

    async def send_sms(self, phone: str, message: str) -> tuple[bool, str | None]:
        """
        Send SMS via Twilio ou nVoIP conforme sms_provider.
        Returns (success, error_message).
        """
        enabled = await self.settings.get_bool(SettingsKeys.SMS_ENABLED)
        if not enabled:
            logger.info("SMS disabled, skipping", phone=phone)
            return False, "SMS desativado no painel"

        provider = (await self.settings.get(SettingsKeys.SMS_PROVIDER)) or "twilio"
        if provider == "twilio":
            return await self._send_sms_twilio(phone, message)
        return await self._send_sms_nvoip(phone, message)

    async def _send_sms_twilio(self, phone: str, message: str) -> tuple[bool, str | None]:
        """Send SMS via Twilio API."""
        sid = await self.settings.get(SettingsKeys.TWILIO_ACCOUNT_SID)
        token = await self.settings.get(SettingsKeys.TWILIO_AUTH_TOKEN)
        from_num = await self.settings.get(SettingsKeys.TWILIO_SMS_FROM)
        if not sid or not token or not from_num:
            return False, "Twilio: preencha Account SID, Auth Token e numero SMS (twilio_sms_from)"
        from_num = from_num.strip().replace(" ", "")
        if not from_num.startswith("+"):
            from_num = "+" + from_num
        to_num = "".join(filter(str.isdigit, phone))
        if not to_num.startswith("+"):
            to_num = "+" + to_num
        if len(to_num) <= 11 and not to_num.startswith("+55"):
            to_num = "+55" + to_num
        url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
        auth = (sid, token)
        data = {"From": from_num, "To": to_num, "Body": message}
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(url, auth=auth, data=data)
                if response.status_code in (200, 201):
                    logger.info("Twilio SMS sent", phone=phone)
                    return True, None
                try:
                    body = response.json()
                    err_msg = body.get("message") or body.get("error_text") or response.text[:200]
                except Exception:
                    err_msg = response.text[:200] or f"HTTP {response.status_code}"
                logger.error(
                    "Twilio SMS failed", phone=phone, status=response.status_code, response=err_msg
                )
                return False, err_msg
        except Exception as e:
            logger.error("Twilio SMS error", error=str(e), phone=phone)
            return False, str(e)

    async def _send_sms_nvoip(self, phone: str, message: str) -> tuple[bool, str | None]:
        """Send SMS via nVoIP API."""
        token = await self.settings.get(SettingsKeys.NVOIP_TOKEN)
        if not token:
            return False, "Token nVoIP nao configurado"
        clean_phone = "".join(filter(str.isdigit, phone))
        if len(clean_phone) <= 11 and not clean_phone.startswith("55"):
            clean_phone = f"55{clean_phone}"
        from urllib.parse import urlencode
        from app.services.sms_service import _normalize_sms_message, _is_napikey

        token = (token or "").strip()
        use_napikey = _is_napikey(token)
        url = "https://api.nvoip.com.br/v2/sms"
        if use_napikey:
            url = f"{url}?{urlencode({'napikey': token})}"
        headers = {"Content-Type": "application/json"}
        if not use_napikey:
            headers["Authorization"] = f"Bearer {token}"
        payload = {
            "numberPhone": clean_phone,
            "message": _normalize_sms_message(message),
            "flashSms": False,
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, json=payload, headers=headers)
                if response.status_code in (200, 201):
                    logger.info("SMS sent (nVoIP)", phone=phone)
                    return True, None
                try:
                    body = response.json()
                    err_msg = body.get("message") or body.get("error") or response.text[:200]
                except Exception:
                    err_msg = response.text[:200] or f"HTTP {response.status_code}"
                return False, err_msg
        except Exception as e:
            return False, str(e)

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
