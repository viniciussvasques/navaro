"""Structured logging configuration with maintenance mode support."""

import logging
import sys
from typing import Any

import structlog
from structlog.types import Processor

from app.core.config import settings, AppMode


def _add_app_context(
    logger: logging.Logger, method_name: str, event_dict: dict[str, Any]
) -> dict[str, Any]:
    """Add application context to log events."""
    event_dict["app"] = settings.APP_NAME
    event_dict["version"] = settings.APP_VERSION
    event_dict["environment"] = settings.ENVIRONMENT
    event_dict["mode"] = settings.APP_MODE.value
    return event_dict


def _filter_sensitive(
    logger: logging.Logger, method_name: str, event_dict: dict[str, Any]
) -> dict[str, Any]:
    """Filter sensitive data from logs."""
    sensitive_keys = {"password", "token", "secret", "authorization", "api_key", "credit_card"}
    
    def _redact(obj: Any, depth: int = 0) -> Any:
        if depth > 5:  # Prevent infinite recursion
            return obj
        if isinstance(obj, dict):
            return {
                k: "[REDACTED]" if k.lower() in sensitive_keys else _redact(v, depth + 1)
                for k, v in obj.items()
            }
        if isinstance(obj, list):
            return [_redact(item, depth + 1) for item in obj]
        return obj
    
    return _redact(event_dict)


def _drop_color_message(
    logger: logging.Logger, method_name: str, event_dict: dict[str, Any]
) -> dict[str, Any]:
    """Drop color_message key for JSON output."""
    event_dict.pop("color_message", None)
    return event_dict


def get_processors() -> list[Processor]:
    """Get log processors based on settings."""
    processors: list[Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        _add_app_context,
    ]
    
    # Filter sensitive data in production
    if settings.is_production:
        processors.append(_filter_sensitive)
    
    # Add exception info in debug/maintenance
    if settings.is_debug:
        processors.append(structlog.processors.format_exc_info)
    
    processors.append(structlog.processors.UnicodeDecoder())
    
    return processors


def setup_logging() -> None:
    """Configure structured logging for the application."""
    # Determine log level
    log_level = getattr(logging, settings.log_level_effective.upper(), logging.INFO)
    
    # Get processors
    processors = get_processors()
    
    # Choose renderer based on format
    if settings.LOG_FORMAT == "json":
        processors.append(_drop_color_message)
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer(colors=True))
    
    # Configure structlog
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )
    
    # Configure standard logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=log_level,
    )
    
    # Suppress noisy loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    
    # Enable SQL logging in debug/maintenance
    if settings.APP_MODE in (AppMode.DEBUG, AppMode.MAINTENANCE):
        logging.getLogger("sqlalchemy.engine").setLevel(logging.INFO)
    else:
        logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    """Get a logger instance."""
    return structlog.get_logger(name)


# ─── Log Context Helpers ───────────────────────────────────────────────────────


def bind_context(**kwargs: Any) -> None:
    """Bind context variables for the current request."""
    structlog.contextvars.bind_contextvars(**kwargs)


def clear_context() -> None:
    """Clear context variables."""
    structlog.contextvars.clear_contextvars()


def unbind_context(*keys: str) -> None:
    """Unbind specific context variables."""
    structlog.contextvars.unbind_contextvars(*keys)
