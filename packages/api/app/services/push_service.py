"""Push notification service using Firebase Cloud Messaging (FCM)."""

from typing import Any

import httpx

from app.core.logging import get_logger
from app.models.system_settings import SettingsKeys

logger = get_logger(__name__)


class PushService:
    """Push notification service using FCM."""

    async def get_settings(self) -> dict:
        """Get push settings from database."""
        from app.core import database
        from app.services.settings_service import SettingsService

        async with database.async_session_maker() as session:
            settings_service = SettingsService(session)
            return {
                "enabled": await settings_service.get_bool(SettingsKeys.FCM_ENABLED, False),
                "server_key": await settings_service.get(SettingsKeys.FCM_SERVER_KEY, "") or "",
            }

    async def send(
        self,
        device_token: str,
        title: str,
        body: str,
        data: dict[str, Any] | None = None,
        image: str | None = None,
    ) -> bool:
        """
        Send push notification to a single device.
        """
        settings = await self.get_settings()

        if not settings["enabled"]:
            logger.info("Push disabled", title=title, body=body[:50])
            return True  # Simulate success

        if not settings["server_key"]:
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
                        "Authorization": f"key={settings['server_key']}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                    timeout=10.0,
                )

                if response.status_code == 200:
                    result = response.json()
                    if result.get("success", 0) > 0:
                        logger.info("Push sent", title=title)
                        return True
                    logger.error("Push rejected", response=result)
                    return False
                logger.error("Push failed", status=response.status_code)
                return False

        except Exception as e:
            logger.error("Push error", error=str(e))
            return False

    async def send_to_many(
        self, device_tokens: list[str], title: str, body: str, data: dict[str, Any] | None = None
    ) -> int:
        """
        Send push notification to multiple devices.
        """
        settings = await self.get_settings()

        if not settings["enabled"] or not settings["server_key"]:
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
                        "Authorization": f"key={settings['server_key']}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                    timeout=15.0,
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
        self, topic: str, title: str, body: str, data: dict[str, Any] | None = None
    ) -> bool:
        """Send push notification to a topic (e.g., all users of an establishment)."""
        settings = await self.get_settings()

        if not settings["enabled"] or not settings["server_key"]:
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
                        "Authorization": f"key={settings['server_key']}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                    timeout=10.0,
                )
                return response.status_code == 200

        except Exception as e:
            logger.error("Push topic error", error=str(e))
            return False


# Singleton
_push_service: PushService | None = None


def get_push_service() -> PushService:
    """Get push service singleton."""
    global _push_service
    if _push_service is None:
        _push_service = PushService()
    return _push_service
