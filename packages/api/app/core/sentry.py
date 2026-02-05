"""Sentry integration for error tracking and performance monitoring."""

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.httpx import HttpxIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def init_sentry() -> bool:
    """
    Initialize Sentry SDK for error tracking.

    Returns:
        True if Sentry was initialized, False otherwise.
    """
    settings = get_settings()

    # Check if Sentry DSN is configured
    sentry_dsn = getattr(settings, "SENTRY_DSN", None)

    if not sentry_dsn:
        logger.info("Sentry DSN not configured, skipping initialization")
        return False

    try:
        sentry_sdk.init(
            dsn=sentry_dsn,
            environment=settings.ENVIRONMENT,
            release=f"navaro-api@{settings.APP_VERSION}",
            # Performance monitoring
            traces_sample_rate=0.1 if settings.ENVIRONMENT == "production" else 1.0,
            profiles_sample_rate=0.1 if settings.ENVIRONMENT == "production" else 1.0,
            # Integrations
            integrations=[
                FastApiIntegration(transaction_style="endpoint"),
                SqlalchemyIntegration(),
                RedisIntegration(),
                HttpxIntegration(),
            ],
            # Data scrubbing
            send_default_pii=False,
            # Before send hook for filtering
            before_send=_before_send,
        )

        logger.info(
            "Sentry initialized",
            environment=settings.ENVIRONMENT,
            release=f"navaro-api@{settings.APP_VERSION}",
        )
        return True

    except Exception as e:
        logger.error("Failed to initialize Sentry", error=str(e))
        return False


def _before_send(event, hint):
    """
    Filter events before sending to Sentry.

    Use this to:
    - Filter out expected errors
    - Scrub sensitive data
    - Add additional context
    """
    # Don't send 404 errors
    if event.get("exception"):
        exceptions = event["exception"].get("values", [])
        for exc in exceptions:
            if exc.get("type") == "HTTPException":
                # Filter out common HTTP errors
                if "404" in str(exc.get("value", "")):
                    return None

    return event


def capture_exception(error: Exception, **context):
    """
    Capture an exception with additional context.

    Args:
        error: The exception to capture
        **context: Additional context to attach
    """
    with sentry_sdk.push_scope() as scope:
        for key, value in context.items():
            scope.set_extra(key, value)
        sentry_sdk.capture_exception(error)


def capture_message(message: str, level: str = "info", **context):
    """
    Capture a message with additional context.

    Args:
        message: The message to capture
        level: Log level (info, warning, error)
        **context: Additional context to attach
    """
    with sentry_sdk.push_scope() as scope:
        for key, value in context.items():
            scope.set_extra(key, value)
        sentry_sdk.capture_message(message, level=level)


def set_user(user_id: str, email: str = None, phone: str = None):
    """Set user context for Sentry."""
    sentry_sdk.set_user(
        {
            "id": user_id,
            "email": email,
            "phone": phone,
        }
    )


def set_tag(key: str, value: str):
    """Set a tag for the current scope."""
    sentry_sdk.set_tag(key, value)
