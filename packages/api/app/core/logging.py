"""Structured logging configuration with maintenance mode support."""

import logging
import sys
from datetime import datetime
from typing import Any
import asyncio
from collections import deque

import structlog
from structlog.types import Processor

from app.core.config import AppMode, settings


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


# ─── Live Log Broadcaster ──────────────────────────────────────────────────

class LogBroadcaster:
    """Simple broadcaster for log events."""
    def __init__(self, maxlen: int = 100):
        self.queue = deque(maxlen=maxlen)
        self.listeners = set()

    def broadcast(self, event: dict[str, Any]):
        self.queue.append(event)
        for listener in self.listeners:
            try:
                listener.put_nowait(event.copy())
            except asyncio.QueueFull:
                pass

    async def subscribe(self):
        queue = asyncio.Queue()
        # Seed with history
        for event in self.queue:
            queue.put_nowait(event)
        self.listeners.add(queue)
        try:
            while True:
                yield await queue.get()
        finally:
            self.listeners.remove(queue)

class BroadcastingLogHandler(logging.Handler):
    """Logging handler that broadcasts events to live listeners."""
    def emit(self, record: logging.LogRecord):
        try:
            # We want to broadcast the formatted message
            event = {
                "event": self.format(record),
                "level": record.levelname.lower(),
                "timestamp": datetime.fromtimestamp(record.created).isoformat(),
                "logger": record.name,
            }
            # Avoid double-broadcasting if it's already a structlog event
            # (though structlog usually doesn't hit standard handlers if configured correctly)
            if hasattr(record, "msg") and isinstance(record.msg, dict):
                return

            # Add extra attributes if they exist
            if hasattr(record, "props"):
                event.update(record.props)

            broadcaster.broadcast(event)
        except Exception:
            pass

broadcaster = LogBroadcaster()

def _broadcast_log(
    logger: logging.Logger, method_name: str, event_dict: dict[str, Any]
) -> dict[str, Any]:
    """Broadcast structlog event to live listeners."""
    try:
        broadcaster.broadcast(event_dict.copy())
    except Exception:
        pass
    return event_dict

# ─── Existing Setup ─────────────────────────────────────────────────────────

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
    
    # Always broadcast to live admin console
    processors.append(_broadcast_log)

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
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Add broadcasting handler
    broadcast_handler = BroadcastingLogHandler()
    broadcast_handler.setLevel(log_level)
    root_logger.addHandler(broadcast_handler)

    # Console output
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(logging.Formatter("%(message)s"))
    root_logger.addHandler(console_handler)

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
