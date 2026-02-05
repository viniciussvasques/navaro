"""SMS Service using nVoIP API."""

import httpx
from typing import Optional

from app.core.logging import get_logger
from app.services.settings_service import get_cached_setting, get_cached_bool
from app.models.system_settings import SettingsKeys

logger = get_logger(__name__)


class SMSService:
    """SMS service using nVoIP API for Brazil."""

    def __init__(self):
        # Settings are loaded from database cache
        pass

    @property
    def api_url(self) -> str:
        return "https://api.nvoip.com.br/v2"

    @property
    def token(self) -> str:
        return get_cached_setting(SettingsKeys.NVOIP_TOKEN, "") or ""

    @property
    def from_number(self) -> str:
        return get_cached_setting(SettingsKeys.NVOIP_FROM_NUMBER, "") or ""

    @property
    def enabled(self) -> bool:
        return get_cached_bool(SettingsKeys.SMS_ENABLED, False)

    async def send(self, phone: str, message: str) -> bool:
        """
        Send SMS via nVoIP API.
        
        Args:
            phone: Phone number in E.164 format (e.g., +5511999999999)
            message: SMS content (max 160 chars for single SMS)
            
        Returns:
            True if sent successfully, False otherwise
        """
        if not self.enabled:
            logger.info("SMS disabled, would send", phone=phone, message=message[:50])
            return True  # Simulate success in dev

        if not self.token:
            logger.warning("SMS enabled but NVOIP_TOKEN not configured")
            return False

        # Normalize phone number (remove +55 prefix for Brazil)
        clean_phone = phone.lstrip("+")
        if clean_phone.startswith("55"):
            clean_phone = clean_phone[2:]  # Remove country code

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.api_url}/sms/messages",
                    headers={
                        "Authorization": f"Bearer {self.token}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "type": "Standard",
                        "content": message,
                        "contacts": [{"phone": clean_phone}],
                        "options": {
                            "flash": False,
                        }
                    },
                    timeout=10.0
                )

                if response.status_code in [200, 201, 202]:
                    logger.info("SMS sent successfully", phone=phone)
                    return True
                else:
                    logger.error(
                        "SMS send failed",
                        phone=phone,
                        status=response.status_code,
                        response=response.text[:200]
                    )
                    return False

        except Exception as e:
            logger.error("SMS send error", phone=phone, error=str(e))
            return False

    async def send_verification_code(self, phone: str, code: str) -> bool:
        """Send verification code SMS."""
        message = f"Navaro: Seu código é {code}. Válido por 5 minutos."
        return await self.send(phone, message)

    async def send_appointment_confirmation(
        self,
        phone: str,
        establishment_name: str,
        date: str,
        time: str
    ) -> bool:
        """Send appointment confirmation SMS."""
        message = f"Navaro: Agendamento confirmado para {date} às {time} em {establishment_name}."
        return await self.send(phone, message)

    async def send_appointment_reminder(
        self,
        phone: str,
        establishment_name: str,
        time: str
    ) -> bool:
        """Send appointment reminder (24h before)."""
        message = f"Navaro: Lembrete! Você tem agendamento amanhã às {time} em {establishment_name}."
        return await self.send(phone, message)

    async def send_appointment_cancelled(
        self,
        phone: str,
        establishment_name: str,
        reason: Optional[str] = None
    ) -> bool:
        """Send appointment cancellation SMS."""
        message = f"Navaro: Seu agendamento em {establishment_name} foi cancelado."
        if reason:
            message += f" Motivo: {reason}"
        return await self.send(phone, message)

    async def send_payment_received(
        self,
        phone: str,
        amount: float,
        establishment_name: str
    ) -> bool:
        """Send payment confirmation to establishment owner."""
        message = f"Navaro: Pagamento de R${amount:.2f} recebido em {establishment_name}."
        return await self.send(phone, message)


# Singleton instance
_sms_service: Optional[SMSService] = None


def get_sms_service() -> SMSService:
    """Get SMS service singleton."""
    global _sms_service
    if _sms_service is None:
        _sms_service = SMSService()
    return _sms_service
