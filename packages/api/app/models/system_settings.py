"""System settings model - stored in database, managed via admin panel."""

from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class SystemSettings(BaseModel):
    """
    System-wide settings stored in database.
    Allows admin to configure tokens and settings without redeploying.
    Uses key-value pattern for flexibility.
    """

    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    value: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_secret: Mapped[bool] = mapped_column(Boolean, default=False)  # Mask in UI
    category: Mapped[str] = mapped_column(String(50), default="general")

    def __repr__(self) -> str:
        return f"<SystemSettings {self.key}>"


# ─── Settings Keys ──────────────────────────────────────────────────────────────


class SettingsKeys:
    """Constants for settings keys - all configurable via admin panel."""

    # ─── SMS (nVoIP ou Twilio) ──────────────────────────────────────────────────
    SMS_ENABLED = "sms_enabled"
    SMS_PROVIDER = "sms_provider"  # "nvoip" | "twilio"
    NVOIP_TOKEN = "nvoip_token"
    NVOIP_FROM_NUMBER = "nvoip_from_number"
    # Twilio (SMS e WhatsApp)
    TWILIO_ACCOUNT_SID = "twilio_account_sid"
    TWILIO_AUTH_TOKEN = "twilio_auth_token"
    TWILIO_SMS_FROM = "twilio_sms_from"  # Número Twilio para SMS (ex: +15551234567)

    # ─── Payments: Stripe ───────────────────────────────────────────────────────
    STRIPE_SECRET_KEY = "stripe_secret_key"
    STRIPE_PUBLISHABLE_KEY = "stripe_publishable_key"
    STRIPE_WEBHOOK_SECRET = "stripe_webhook_secret"
    STRIPE_PLATFORM_FEE_PERCENT = "stripe_platform_fee_percent"
    COMMISSION_FREE = "commission_free"
    COMMISSION_SILVER = "commission_silver"
    COMMISSION_GOLD = "commission_gold"
    STRIPE_ENABLED = "stripe_enabled"

    # ─── Payments: Mercado Pago ─────────────────────────────────────────────────
    MERCADOPAGO_ACCESS_TOKEN = "mercadopago_access_token"
    MERCADOPAGO_PUBLIC_KEY = "mercadopago_public_key"
    MERCADOPAGO_WEBHOOK_SECRET = "mercadopago_webhook_secret"
    MERCADOPAGO_ENABLED = "mercadopago_enabled"

    # ─── Email: SMTP ────────────────────────────────────────────────────────────
    SMTP_HOST = "smtp_host"
    SMTP_PORT = "smtp_port"
    SMTP_USER = "smtp_user"
    SMTP_PASSWORD = "smtp_password"
    SMTP_FROM_EMAIL = "smtp_from_email"
    SMTP_FROM_NAME = "smtp_from_name"
    SMTP_USE_TLS = "smtp_use_tls"
    EMAIL_ENABLED = "email_enabled"

    # ─── Push Notifications: FCM ────────────────────────────────────────────────
    FCM_SERVER_KEY = "fcm_server_key"
    FCM_PROJECT_ID = "fcm_project_id"
    FCM_ENABLED = "fcm_enabled"

    # ─── Push Notifications: OneSignal ──────────────────────────────────────────
    ONESIGNAL_APP_ID = "onesignal_app_id"
    ONESIGNAL_API_KEY = "onesignal_api_key"
    ONESIGNAL_ENABLED = "onesignal_enabled"

    # ─── WhatsApp (Twilio, Meta ou Bridge) ──────────────────────────────────────
    WHATSAPP_ENABLED = "whatsapp_enabled"
    WHATSAPP_PROVIDER = "whatsapp_provider"  # "twilio" | "meta" | "bridge"
    # Twilio
    TWILIO_ACCOUNT_SID = "twilio_account_sid"
    TWILIO_AUTH_TOKEN = "twilio_auth_token"
    TWILIO_WHATSAPP_FROM = (
        "twilio_whatsapp_from"  # ex: +14155238886 (sandbox) ou whatsapp:+14155238886
    )
    # Meta Cloud API (opcional)
    WHATSAPP_API_URL = "whatsapp_api_url"
    WHATSAPP_ACCESS_TOKEN = "whatsapp_access_token"
    WHATSAPP_PHONE_NUMBER_ID = "whatsapp_phone_number_id"

    S3_ENDPOINT = "s3_endpoint"
    S3_ACCESS_KEY = "s3_access_key"
    S3_SECRET_KEY = "s3_secret_key"
    S3_BUCKET = "s3_bucket"
    S3_PUBLIC_URL = "s3_public_url"
    STORAGE_ENABLED = "storage_enabled"

    # ─── App Settings ───────────────────────────────────────────────────────────
    APP_NAME = "app_name"
    SUPPORT_EMAIL = "support_email"
    SUPPORT_PHONE = "support_phone"
    TERMS_URL = "terms_url"
    PRIVACY_URL = "privacy_url"

    # ─── Loyalty & Wallet ──────────────────────────────────────────────────────
    CASHBACK_ENABLED = "cashback_enabled"
    CASHBACK_PERCENT = "cashback_percent"
    REFERRAL_BONUS_AMOUNT = "referral_bonus_amount"
