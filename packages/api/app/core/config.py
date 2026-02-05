"""Core configuration using Pydantic Settings."""

from enum import Enum
from functools import lru_cache
from typing import Literal

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AppMode(str, Enum):
    """Application running mode."""

    PRODUCTION = "production"
    DEBUG = "debug"
    MAINTENANCE = "maintenance"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ─── Application ───────────────────────────────────────────────────────────
    APP_NAME: str = "Navaro API"
    APP_VERSION: str = "1.0.0"
    APP_MODE: AppMode = AppMode.PRODUCTION
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"

    # ─── Server ────────────────────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 1

    # ─── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://navaro:navaro_dev@localhost:5432/navaro"
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10
    DATABASE_ECHO: bool = False  # Log SQL queries

    # ─── Redis ─────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_PREFIX: str = "navaro:"

    # ─── Security ──────────────────────────────────────────────────────────────
    SECRET_KEY: str = "CHANGE-ME-IN-PRODUCTION-USE-STRONG-SECRET"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ADMIN_TOKEN: str = "CHANGE-ME-ADMIN-TOKEN"  # For debug endpoints

    # ─── CORS ──────────────────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = Field(default=["http://localhost:3000", "http://localhost:8081"])
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: list[str] = Field(default=["*"])
    CORS_ALLOW_HEADERS: list[str] = Field(default=["*"])

    # ─── Stripe ────────────────────────────────────────────────────────────────
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PLATFORM_FEE_PERCENT: float = 5.0

    # ─── Twilio (SMS/WhatsApp) ─────────────────────────────────────────────────
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""

    # ─── Storage (S3/R2) ───────────────────────────────────────────────────────
    S3_ENDPOINT: str = ""
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_BUCKET: str = "navaro"
    S3_PUBLIC_URL: str = ""

    # ─── Rate Limiting ─────────────────────────────────────────────────────────
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW_SECONDS: int = 60

    # ─── Logging ───────────────────────────────────────────────────────────────
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: Literal["json", "console"] = "console"

    # ─── Maintenance ───────────────────────────────────────────────────────────
    MAINTENANCE_SQL_LOG_SIZE: int = 100  # Number of SQL queries to keep
    MAINTENANCE_PROFILING: bool = False

    # ─── Computed Properties ───────────────────────────────────────────────────
    @computed_field
    @property
    def is_debug(self) -> bool:
        """Check if running in debug mode."""
        return self.APP_MODE in (AppMode.DEBUG, AppMode.MAINTENANCE)

    @computed_field
    @property
    def is_maintenance(self) -> bool:
        """Check if running in maintenance mode."""
        return self.APP_MODE == AppMode.MAINTENANCE

    @computed_field
    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.APP_MODE == AppMode.PRODUCTION and self.ENVIRONMENT == "production"

    @computed_field
    @property
    def log_level_effective(self) -> str:
        """Get effective log level based on mode."""
        if self.APP_MODE == AppMode.MAINTENANCE:
            return "DEBUG"
        if self.APP_MODE == AppMode.DEBUG:
            return "DEBUG"
        return self.LOG_LEVEL

    @computed_field
    @property
    def database_echo_effective(self) -> bool:
        """Get effective database echo based on mode."""
        if self.APP_MODE in (AppMode.DEBUG, AppMode.MAINTENANCE):
            return True
        return self.DATABASE_ECHO


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Convenience access
settings = get_settings()
