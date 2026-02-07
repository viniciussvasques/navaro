"""WhatsApp Business API service."""

import httpx

from app.core.logging import get_logger
from app.models.system_settings import SettingsKeys

logger = get_logger(__name__)


class WhatsAppService:
    """WhatsApp Business API service (Meta Cloud API)."""

    async def get_settings(self) -> dict:
        """Get whatsapp settings from database."""
        from app.core import database
        from app.services.settings_service import SettingsService

        async with database.async_session_maker() as session:
            settings_service = SettingsService(session)
            return {
                "enabled": await settings_service.get_bool(SettingsKeys.WHATSAPP_ENABLED, False),
                "api_url": await settings_service.get(
                    SettingsKeys.WHATSAPP_API_URL, "https://graph.facebook.com/v18.0"
                )
                or "https://graph.facebook.com/v18.0",
                "access_token": await settings_service.get(SettingsKeys.WHATSAPP_ACCESS_TOKEN, "")
                or "",
                "phone_number_id": await settings_service.get(
                    SettingsKeys.WHATSAPP_PHONE_NUMBER_ID, ""
                )
                or "",
            }

    async def send_text(self, to_phone: str, message: str) -> bool:
        """
        Send text message via WhatsApp.
        """
        settings = await self.get_settings()

        if not settings["enabled"]:
            logger.info("WhatsApp disabled", to=to_phone, message=message[:50])
            return True

        if not settings["access_token"] or not settings["phone_number_id"]:
            logger.warning("WhatsApp enabled but not configured")
            return False

        # Normalize phone (remove + and spaces)
        clean_phone = to_phone.replace("+", "").replace(" ", "").replace("-", "")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings['api_url']}/{settings['phone_number_id']}/messages",
                    headers={
                        "Authorization": f"Bearer {settings['access_token']}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "messaging_product": "whatsapp",
                        "recipient_type": "individual",
                        "to": clean_phone,
                        "type": "text",
                        "text": {"body": message},
                    },
                    timeout=15.0,
                )

                if response.status_code in [200, 201]:
                    logger.info("WhatsApp sent", to=to_phone)
                    return True
                logger.error(
                    "WhatsApp failed", status=response.status_code, response=response.text[:200]
                )
                return False

        except Exception as e:
            logger.error("WhatsApp error", error=str(e))
            return False

    async def send_template(
        self,
        to_phone: str,
        template_name: str,
        language_code: str = "pt_BR",
        components: list | None = None,
    ) -> bool:
        """
        Send template message via WhatsApp (for approved templates).
        """
        settings = await self.get_settings()

        if not settings["enabled"] or not settings["access_token"]:
            return False

        clean_phone = to_phone.replace("+", "").replace(" ", "").replace("-", "")

        try:
            payload = {
                "messaging_product": "whatsapp",
                "to": clean_phone,
                "type": "template",
                "template": {
                    "name": template_name,
                    "language": {"code": language_code},
                },
            }

            if components:
                payload["template"]["components"] = components

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings['api_url']}/{settings['phone_number_id']}/messages",
                    headers={
                        "Authorization": f"Bearer {settings['access_token']}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                    timeout=15.0,
                )

                return response.status_code in [200, 201]

        except Exception as e:
            logger.error("WhatsApp template error", error=str(e))
            return False

    # ─── Convenience Methods ────────────────────────────────────────────────────

    async def send_appointment_confirmation(
        self, to_phone: str, establishment_name: str, date: str, time: str
    ) -> bool:
        """Send appointment confirmation via WhatsApp."""
        message = f"✅ *Agendamento Confirmado*\n\n📍 {establishment_name}\n📅 {date}\n🕐 {time}\n\nChegue 5 min antes! 😊"
        return await self.send_text(to_phone, message)

    async def send_appointment_reminder(
        self, to_phone: str, establishment_name: str, time: str
    ) -> bool:
        """Send appointment reminder via WhatsApp."""
        message = f"⏰ *Lembrete*\n\nVocê tem horário *amanhã* às {time} em {establishment_name}.\n\nNão esqueça! 👋"
        return await self.send_text(to_phone, message)

    async def send_verification_code(self, to_phone: str, code: str) -> bool:
        """Send verification code via WhatsApp."""
        message = f"🔐 Seu código de verificação Navaro é: *{code}*\n\nVálido por 5 minutos."
        return await self.send_text(to_phone, message)


# Singleton
_whatsapp_service: WhatsAppService | None = None


def get_whatsapp_service() -> WhatsAppService:
    """Get WhatsApp service singleton."""
    global _whatsapp_service
    if _whatsapp_service is None:
        _whatsapp_service = WhatsAppService()
    return _whatsapp_service
