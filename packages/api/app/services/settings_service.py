"""Settings service - reads/writes system settings from database."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.core.redis import get_redis
from app.models.system_settings import SettingsKeys, SystemSettings

logger = get_logger(__name__)


class SettingsService:
    """Service for managing system settings stored in database."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, key: str, default: str | None = None) -> str | None:
        """Get a setting value by key."""
        # Try Redis first
        try:
            redis = await get_redis()
            cached_value = await redis.get(f"settings:{key}")
            if cached_value is not None:
                return cached_value
        except Exception as e:
            logger.warning("Redis error in settings.get", error=str(e))

        # Query database
        result = await self.db.execute(select(SystemSettings).where(SystemSettings.key == key))
        setting = result.scalar_one_or_none()

        if setting:
            # Cache in Redis (1 hour TTL)
            try:
                redis = await get_redis()
                if setting.value:
                    await redis.setex(f"settings:{key}", 3600, setting.value)
            except Exception as e:
                logger.warning("Redis set error", error=str(e))
            return setting.value

        return default

    async def get_bool(self, key: str, default: bool = False) -> bool:
        """Get a boolean setting."""
        value = await self.get(key)
        if value is None:
            return default
        return value.lower() in ("true", "1", "yes", "on")

    async def get_float(self, key: str, default: float = 0.0) -> float:
        """Get a float setting."""
        value = await self.get(key)
        if value is None:
            return default
        try:
            return float(value)
        except ValueError:
            return default

    async def set(
        self,
        key: str,
        value: str,
        description: str | None = None,
        is_secret: bool = False,
        category: str = "general",
    ) -> SystemSettings:
        """Set a setting value (create or update)."""
        global _settings_cache

        result = await self.db.execute(select(SystemSettings).where(SystemSettings.key == key))
        setting = result.scalar_one_or_none()

        if setting:
            setting.value = value
            if description:
                setting.description = description
        else:
            setting = SystemSettings(
                key=key,
                value=value,
                description=description,
                is_secret=is_secret,
                category=category,
            )
            self.db.add(setting)

        await self.db.commit()
        await self.db.refresh(setting)

        await self.db.commit()
        await self.db.refresh(setting)

        # Update Redis
        try:
            redis = await get_redis()
            await redis.setex(f"settings:{key}", 3600, value)
            logger.info("Setting updated in DB and Redis", key=key)
        except Exception as e:
            logger.warning("Redis update error", error=str(e))
            logger.info("Setting updated in DB only", key=key)

        return setting

    async def delete(self, key: str) -> bool:
        """Delete a setting."""
        global _settings_cache

        result = await self.db.execute(select(SystemSettings).where(SystemSettings.key == key))
        setting = result.scalar_one_or_none()

        if setting:
            await self.db.delete(setting)
            await self.db.commit()
            _settings_cache.pop(key, None)
            return True
        return False

    async def list_all(self, category: str | None = None) -> list[SystemSettings]:
        """List all settings, optionally filtered by category."""
        query = select(SystemSettings)
        if category:
            query = query.where(SystemSettings.category == category)
        query = query.order_by(SystemSettings.category, SystemSettings.key)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    # Cache methods removed in favor of Redis on-demand caching

    async def seed_defaults(self) -> int:
        """Seed default settings if they don't exist."""
        defaults = [
            # SMS
            (SettingsKeys.SMS_ENABLED, "false", "Ativar envio de SMS via nVoIP", False, "sms"),
            (SettingsKeys.NVOIP_TOKEN, "", "Token de acesso da nVoIP", True, "sms"),
            (SettingsKeys.NVOIP_FROM_NUMBER, "", "Número de origem para SMS", False, "sms"),
            # Payments: Stripe
            (
                SettingsKeys.STRIPE_ENABLED,
                "false",
                "Ativar pagamentos via Stripe",
                False,
                "payments",
            ),
            (SettingsKeys.STRIPE_SECRET_KEY, "", "Stripe Secret Key", True, "payments"),
            (SettingsKeys.STRIPE_PUBLISHABLE_KEY, "", "Stripe Publishable Key", False, "payments"),
            (SettingsKeys.STRIPE_WEBHOOK_SECRET, "", "Stripe Webhook Secret", True, "payments"),
            (
                SettingsKeys.STRIPE_PLATFORM_FEE_PERCENT,
                "5.0",
                "Taxa da plataforma (%)",
                False,
                "payments",
            ),
            # Payments: Mercado Pago
            (
                SettingsKeys.MERCADOPAGO_ENABLED,
                "false",
                "Ativar pagamentos via Mercado Pago",
                False,
                "payments",
            ),
            (
                SettingsKeys.MERCADOPAGO_ACCESS_TOKEN,
                "",
                "Mercado Pago Access Token",
                True,
                "payments",
            ),
            (SettingsKeys.MERCADOPAGO_PUBLIC_KEY, "", "Mercado Pago Public Key", False, "payments"),
            (
                SettingsKeys.MERCADOPAGO_WEBHOOK_SECRET,
                "",
                "Mercado Pago Webhook Secret",
                True,
                "payments",
            ),
            # Email SMTP
            (SettingsKeys.EMAIL_ENABLED, "false", "Ativar envio de emails", False, "email"),
            (SettingsKeys.SMTP_HOST, "", "Servidor SMTP", False, "email"),
            (SettingsKeys.SMTP_PORT, "587", "Porta SMTP", False, "email"),
            (SettingsKeys.SMTP_USER, "", "Usuário SMTP", False, "email"),
            (SettingsKeys.SMTP_PASSWORD, "", "Senha SMTP", True, "email"),
            (SettingsKeys.SMTP_FROM_EMAIL, "", "Email de origem", False, "email"),
            (SettingsKeys.SMTP_FROM_NAME, "Navaro", "Nome de origem", False, "email"),
            (SettingsKeys.SMTP_USE_TLS, "true", "Usar TLS", False, "email"),
            # Push: FCM
            (SettingsKeys.FCM_ENABLED, "false", "Ativar push notifications via FCM", False, "push"),
            (SettingsKeys.FCM_SERVER_KEY, "", "FCM Server Key", True, "push"),
            (SettingsKeys.FCM_PROJECT_ID, "", "FCM Project ID", False, "push"),
            # Push: OneSignal
            (SettingsKeys.ONESIGNAL_ENABLED, "false", "Ativar push via OneSignal", False, "push"),
            (SettingsKeys.ONESIGNAL_APP_ID, "", "OneSignal App ID", False, "push"),
            (SettingsKeys.ONESIGNAL_API_KEY, "", "OneSignal API Key", True, "push"),
            # WhatsApp Business
            (
                SettingsKeys.WHATSAPP_ENABLED,
                "false",
                "Ativar WhatsApp Business API",
                False,
                "whatsapp",
            ),
            (
                SettingsKeys.WHATSAPP_API_URL,
                "https://graph.facebook.com/v18.0",
                "WhatsApp API URL",
                False,
                "whatsapp",
            ),
            (SettingsKeys.WHATSAPP_ACCESS_TOKEN, "", "WhatsApp Access Token", True, "whatsapp"),
            (
                SettingsKeys.WHATSAPP_PHONE_NUMBER_ID,
                "",
                "WhatsApp Phone Number ID",
                False,
                "whatsapp",
            ),
            # Storage
            (SettingsKeys.STORAGE_ENABLED, "false", "Ativar storage S3/R2", False, "storage"),
            (SettingsKeys.S3_ENDPOINT, "", "S3 Endpoint URL", False, "storage"),
            (SettingsKeys.S3_ACCESS_KEY, "", "S3 Access Key", True, "storage"),
            (SettingsKeys.S3_SECRET_KEY, "", "S3 Secret Key", True, "storage"),
            (SettingsKeys.S3_BUCKET, "navaro", "S3 Bucket Name", False, "storage"),
            (SettingsKeys.S3_PUBLIC_URL, "", "S3 Public URL", False, "storage"),
            # App
            (SettingsKeys.APP_NAME, "Navaro", "Nome do aplicativo", False, "general"),
            (SettingsKeys.SUPPORT_EMAIL, "", "Email de suporte", False, "general"),
            (SettingsKeys.SUPPORT_PHONE, "", "Telefone de suporte", False, "general"),
            (SettingsKeys.TERMS_URL, "", "URL dos Termos de Uso", False, "general"),
            (SettingsKeys.PRIVACY_URL, "", "URL da Política de Privacidade", False, "general"),
        ]

        count = 0
        for key, value, desc, is_secret, category in defaults:
            existing = await self.get(key)
            if existing is None:
                await self.set(key, value, desc, is_secret, category)
                count += 1

        return count
