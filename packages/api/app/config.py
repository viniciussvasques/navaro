"""Application configuration."""

from enum import Enum

from pydantic_settings import BaseSettings, SettingsConfigDict


class AppMode(str, Enum):
    """Application running mode."""

    DEVELOPMENT = "development"
    PRODUCTION = "production"
    TESTING = "testing"
    DEBUG = "debug"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # App
    APP_NAME: str = "Navaro API"
    APP_VERSION: str = "1.0.0"
    APP_MODE: AppMode = AppMode.DEVELOPMENT
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 1
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "console"
    ADMIN_TOKEN: str = "admin"

    # Rate Limit
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW_SECONDS: int = 60

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://navaro:navaro_dev@localhost:5432/navaro"
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10
    REDIS_PREFIX: str = "navaro:"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:8081",
        "http://localhost:19006",
    ]

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PLATFORM_FEE_PERCENT: float = 5.0
    STRIPE_PLATFORM_FEE_PERCENT_SINGLE: float = 8.0
    STRIPE_PLATFORM_FEE_PERCENT_SUBSCRIPTION: float = 6.0

    # Twilio/WhatsApp
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""

    # Storage (S3/R2)
    S3_ENDPOINT: str = ""
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_BUCKET: str = "navaro"
    S3_PUBLIC_URL: str = ""

    @property
    def is_debug(self) -> bool:
        return self.DEBUG

    @property
    def is_maintenance(self) -> bool:
        return False

    @property
    def log_level_effective(self) -> str:
        return self.LOG_LEVEL


settings = Settings()
