"""WhatsApp notification service (Twilio, Meta Cloud API ou Bridge Baileys)."""

import httpx

from app.core.config import settings
from app.core.logging import get_logger
from app.models.system_settings import SettingsKeys

logger = get_logger(__name__)


class WhatsAppService:
    """WhatsApp via Twilio, Meta Cloud API ou nosso Bridge (Baileys)."""

    async def get_settings(self) -> dict:
        """Load WhatsApp settings (provider + credentials + bridge URL) do banco/env."""
        from app.core import database
        from app.services.settings_service import SettingsService

        async with database.async_session_maker() as session:
            settings_service = SettingsService(session)
            provider = (await settings_service.get(SettingsKeys.WHATSAPP_PROVIDER)) or "twilio"
            return {
                "enabled": await settings_service.get_bool(SettingsKeys.WHATSAPP_ENABLED, False),
                "provider": provider,
                # Meta Cloud
                "api_url": await settings_service.get(
                    SettingsKeys.WHATSAPP_API_URL, "https://graph.facebook.com/v18.0"
                ) or "https://graph.facebook.com/v18.0",
                "access_token": await settings_service.get(SettingsKeys.WHATSAPP_ACCESS_TOKEN, "") or "",
                "phone_number_id": await settings_service.get(SettingsKeys.WHATSAPP_PHONE_NUMBER_ID, "") or "",
                # Twilio
                "twilio_sid": await settings_service.get(SettingsKeys.TWILIO_ACCOUNT_SID, "") or "",
                "twilio_token": await settings_service.get(SettingsKeys.TWILIO_AUTH_TOKEN, "") or "",
                "twilio_whatsapp_from": await settings_service.get(SettingsKeys.TWILIO_WHATSAPP_FROM, "") or "",
                # Bridge (Baileys)
                # Usa URL do .env quando não houver override em banco.
                "bridge_url": settings.WHATSAPP_BRIDGE_URL,
            }

    async def send_text(self, to_phone: str, message: str) -> bool:
        """Send text message via WhatsApp (Twilio ou Meta)."""
        settings = await self.get_settings()
        if not settings["enabled"]:
            logger.info("WhatsApp disabled", to=to_phone)
            return True
        provider = (settings.get("provider") or "twilio").lower()
        if provider == "twilio":
            return await self._send_twilio(to_phone, message, settings)
        if provider == "meta":
            return await self._send_meta(to_phone, message, settings)
        if provider == "bridge":
            return await self._send_bridge(to_phone, message, settings)

        logger.warning("WhatsApp provider desconhecido, usando Twilio como fallback", provider=provider)
        return await self._send_twilio(to_phone, message, settings)

    async def _send_twilio(self, to_phone: str, message: str, settings: dict) -> bool:
        """Send via Twilio WhatsApp API."""
        sid = settings.get("twilio_sid") or ""
        token = settings.get("twilio_token") or ""
        from_num = (settings.get("twilio_whatsapp_from") or "").strip().replace(" ", "")
        if not from_num.startswith("whatsapp:"):
            from_num = "whatsapp:" + (from_num if from_num.startswith("+") else "+" + from_num)
        if not sid or not token or not from_num:
            logger.warning("Twilio WhatsApp: Account SID, Auth Token ou numero nao configurado")
            return False
        to_num = "".join(filter(lambda c: c.isdigit() or c == "+", to_phone))
        if not to_num.startswith("+"):
            to_num = "+" + to_num
        if len(to_num) <= 11 and not to_num.startswith("+55"):
            to_num = "+55" + to_num
        to_num = "whatsapp:" + to_num
        url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
        data = {"From": from_num, "To": to_num, "Body": message}
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(url, auth=(sid, token), data=data)
                if response.status_code in (200, 201):
                    logger.info("WhatsApp sent (Twilio)", to=to_phone)
                    return True
                logger.error("Twilio WhatsApp failed", status=response.status_code, response=response.text[:200])
                return False
        except Exception as e:
            logger.error("WhatsApp Twilio error", error=str(e))
            return False

    async def _send_meta(self, to_phone: str, message: str, settings: dict) -> bool:
        """Send via Meta Cloud API."""
        if not settings.get("access_token") or not settings.get("phone_number_id"):
            logger.warning("Meta WhatsApp not configured")
            return False
        clean_phone = to_phone.replace("+", "").replace(" ", "").replace("-", "")
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings['api_url']}/{settings['phone_number_id']}/messages",
                    headers={"Authorization": f"Bearer {settings['access_token']}", "Content-Type": "application/json"},
                    json={
                        "messaging_product": "whatsapp",
                        "recipient_type": "individual",
                        "to": clean_phone,
                        "type": "text",
                        "text": {"body": message},
                    },
                    timeout=15.0,
                )
                if response.status_code in (200, 201):
                    logger.info("WhatsApp sent (Meta)", to=to_phone)
                    return True
                logger.error("Meta WhatsApp failed", status=response.status_code, response=response.text[:200])
                return False
        except Exception as e:
            logger.error("WhatsApp Meta error", error=str(e))
            return False

    async def _send_bridge(self, to_phone: str, message: str, settings: dict) -> bool:
        """Send via self-hosted Bridge (Baileys)."""
        bridge_url = (settings.get("bridge_url") or settings.WHATSAPP_BRIDGE_URL).rstrip("/")
        if not bridge_url:
            logger.warning("WhatsApp Bridge URL not configured")
            return False

        payload = {"phone": to_phone, "message": message}
        url = f"{bridge_url}/send-text"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, json=payload)
                if 200 <= resp.status_code < 300:
                    logger.info("WhatsApp sent (Bridge)", to=to_phone)
                    return True
                logger.error(
                    "Bridge WhatsApp failed",
                    status=resp.status_code,
                    response=resp.text[:200],
                    url=url,
                )
                return False
        except Exception as e:
            logger.error("WhatsApp Bridge error", error=str(e), url=url)
            return False

    async def send_template(
        self,
        to_phone: str,
        template_name: str,
        language_code: str = "pt_BR",
        components: list | None = None,
    ) -> bool:
        """Send template message via WhatsApp (apenas Meta; Twilio usa mensagem livre)."""
        settings = await self.get_settings()
        if not settings["enabled"] or (settings.get("provider") or "twilio") != "meta":
            return False
        return await self._send_meta_template(to_phone, template_name, language_code, components, settings)

    async def _send_meta_template(
        self,
        to_phone: str,
        template_name: str,
        language_code: str,
        components: list | None,
        settings: dict,
    ) -> bool:
        clean_phone = to_phone.replace("+", "").replace(" ", "").replace("-", "")
        payload = {
            "messaging_product": "whatsapp",
            "to": clean_phone,
            "type": "template",
            "template": {"name": template_name, "language": {"code": language_code}},
        }
        if components:
            payload["template"]["components"] = components
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings['api_url']}/{settings['phone_number_id']}/messages",
                    headers={"Authorization": f"Bearer {settings['access_token']}", "Content-Type": "application/json"},
                    json=payload,
                    timeout=15.0,
                )
                return response.status_code in (200, 201)
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
        message = f"🔐 Seu código de verificação DUNNAA é: *{code}*\n\nVálido por 5 minutos."
        return await self.send_text(to_phone, message)

    async def send_appointment_cancelled(
        self, to_phone: str, establishment_name: str, reason: str | None = None
    ) -> bool:
        """Send appointment cancellation via WhatsApp."""
        msg = f"❌ *Agendamento Cancelado*\n\n📍 {establishment_name}\n\n"
        if reason:
            msg += f"Motivo: {reason}\n\n"
        msg += "Quer remarcar? Abra o app. 👋"
        return await self.send_text(to_phone, msg)

    async def send_queue_joined(
        self, to_phone: str, establishment_name: str, position: int
    ) -> bool:
        """Notify user they joined the queue."""
        message = (
            f"📋 *Você entrou na fila!*\n\n"
            f"📍 {establishment_name}\n"
            f"Posição: *{position}*\n\n"
            f"Acompanhe pelo app. Quando for sua vez, você será avisado. 👋"
        )
        return await self.send_text(to_phone, message)

    async def send_queue_called(self, to_phone: str, establishment_name: str) -> bool:
        """Notify user they were called from the queue."""
        message = (
            f"🔔 *Sua vez!*\n\n"
            f"Você foi chamado na fila em *{establishment_name}*.\n\n"
            f"Por favor, aproxime-se do atendimento. 👋"
        )
        return await self.send_text(to_phone, message)

    async def send_queue_serving(self, to_phone: str, establishment_name: str) -> bool:
        """Notify user they are being served."""
        message = (
            f"✅ *Atendimento iniciado*\n\n"
            f"Você está sendo atendido(a) em *{establishment_name}*.\n\n"
            f"Bom atendimento! 😊"
        )
        return await self.send_text(to_phone, message)


# Singleton
_whatsapp_service: WhatsAppService | None = None


def get_whatsapp_service() -> WhatsAppService:
    """Get WhatsApp service singleton."""
    global _whatsapp_service
    if _whatsapp_service is None:
        _whatsapp_service = WhatsAppService()
    return _whatsapp_service
