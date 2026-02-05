"""Push notification service using Firebase Cloud Messaging (FCM)."""

import httpx
from typing import Optional, List, Dict, Any

from app.core.logging import get_logger
from app.services.settings_service import get_cached_setting, get_cached_bool
from app.models.system_settings import SettingsKeys

logger = get_logger(__name__)


class PushService:
    """Push notification service using FCM."""

    @property
    def enabled(self) -> bool:
        return get_cached_bool(SettingsKeys.FCM_ENABLED, False)

    @property
    def server_key(self) -> str:
        return get_cached_setting(SettingsKeys.FCM_SERVER_KEY, "") or ""

    async def send(
        self,
        device_token: str,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        image: Optional[str] = None
    ) -> bool:
        """
        Send push notification to a single device.
        
        Args:
            device_token: FCM device token
            title: Notification title
            body: Notification body text
            data: Additional data payload
            image: Optional image URL
        """
        if not self.enabled:
            logger.info("Push disabled", title=title, body=body[:50])
            return True  # Simulate success

        if not self.server_key:
            logger.warning("Push enabled but FCM_SERVER_KEY not configured")
            return False

        if not device_token:
            logger.warning("No device token provided")
            return False

        try:
            notification = {
                "title": title,
                "body": body,
            }
            if image:
                notification["image"] = image

            payload = {
                "to": device_token,
                "notification": notification,
                "data": data or {},
                "priority": "high",
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://fcm.googleapis.com/fcm/send",
                    headers={
                        "Authorization": f"key={self.server_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                    timeout=10.0
                )

                if response.status_code == 200:
                    result = response.json()
                    if result.get("success", 0) > 0:
                        logger.info("Push sent", title=title)
                        return True
                    else:
                        logger.error("Push rejected", response=result)
                        return False
                else:
                    logger.error("Push failed", status=response.status_code)
                    return False

        except Exception as e:
            logger.error("Push error", error=str(e))
            return False

    async def send_to_many(
        self,
        device_tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None
    ) -> int:
        """
        Send push notification to multiple devices.
        
        Returns:
            Number of successful sends
        """
        if not self.enabled or not self.server_key:
            return 0

        if not device_tokens:
            return 0

        try:
            payload = {
                "registration_ids": device_tokens[:1000],  # FCM limit
                "notification": {"title": title, "body": body},
                "data": data or {},
                "priority": "high",
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://fcm.googleapis.com/fcm/send",
                    headers={
                        "Authorization": f"key={self.server_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                    timeout=15.0
                )

                if response.status_code == 200:
                    result = response.json()
                    success_count = result.get("success", 0)
                    logger.info("Push batch sent", count=success_count)
                    return success_count
                return 0

        except Exception as e:
            logger.error("Push batch error", error=str(e))
            return 0

    async def send_topic(
        self,
        topic: str,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Send push notification to a topic (e.g., all users of an establishment)."""
        if not self.enabled or not self.server_key:
            return False

        try:
            payload = {
                "to": f"/topics/{topic}",
                "notification": {"title": title, "body": body},
                "data": data or {},
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://fcm.googleapis.com/fcm/send",
                    headers={
                        "Authorization": f"key={self.server_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                    timeout=10.0
                )
                return response.status_code == 200

        except Exception as e:
            logger.error("Push topic error", error=str(e))
            return False


# Singleton
_push_service: Optional[PushService] = None


def get_push_service() -> PushService:
    """Get push service singleton."""
    global _push_service
    if _push_service is None:
        _push_service = PushService()
    return _push_service
