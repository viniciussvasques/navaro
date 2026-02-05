"""Maintenance mode system with debug endpoints and profiling."""

import time
from collections import deque
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from app.core.config import settings


@dataclass
class SQLQuery:
    """Recorded SQL query."""

    query: str
    params: dict[str, Any]
    duration_ms: float
    timestamp: datetime


@dataclass
class RequestStats:
    """Request statistics."""

    total_requests: int = 0
    total_errors: int = 0
    avg_response_time_ms: float = 0.0
    requests_per_endpoint: dict[str, int] = field(default_factory=dict)
    errors_per_endpoint: dict[str, int] = field(default_factory=dict)


class MaintenanceSystem:
    """
    Maintenance system for debugging and profiling.

    Features:
    - SQL query logging
    - Request statistics
    - Performance profiling
    - Debug endpoints data
    """

    def __init__(self) -> None:
        self._sql_queries: deque[SQLQuery] = deque(maxlen=settings.MAINTENANCE_SQL_LOG_SIZE)
        self._stats = RequestStats()
        self._response_times: deque[float] = deque(maxlen=1000)
        self._start_time = datetime.now(UTC)
        self._active_requests: dict[UUID, float] = {}

    def is_enabled(self) -> bool:
        """Check if maintenance mode is enabled."""
        return settings.is_maintenance

    def is_debug(self) -> bool:
        """Check if debug mode is enabled."""
        return settings.is_debug

    # ─── SQL Query Logging ─────────────────────────────────────────────────────

    def log_sql_query(
        self,
        query: str,
        params: dict[str, Any] | None = None,
        duration_ms: float = 0.0,
    ) -> None:
        """Log a SQL query (only in maintenance mode)."""
        if not self.is_enabled():
            return

        self._sql_queries.append(
            SQLQuery(
                query=query,
                params=params or {},
                duration_ms=duration_ms,
                timestamp=datetime.now(UTC),
            )
        )

    def get_sql_log(self) -> list[dict[str, Any]]:
        """Get recent SQL queries."""
        return [
            {
                "query": q.query,
                "params": q.params,
                "duration_ms": q.duration_ms,
                "timestamp": q.timestamp.isoformat(),
            }
            for q in self._sql_queries
        ]

    def clear_sql_log(self) -> None:
        """Clear SQL query log."""
        self._sql_queries.clear()

    # ─── Request Statistics ────────────────────────────────────────────────────

    def start_request(self, request_id: UUID, endpoint: str) -> None:
        """Record start of a request."""
        self._active_requests[request_id] = time.perf_counter()
        self._stats.total_requests += 1
        self._stats.requests_per_endpoint[endpoint] = (
            self._stats.requests_per_endpoint.get(endpoint, 0) + 1
        )

    def end_request(self, request_id: UUID, endpoint: str, is_error: bool = False) -> float:
        """Record end of a request and return duration."""
        start_time = self._active_requests.pop(request_id, None)
        if start_time is None:
            return 0.0

        duration_ms = (time.perf_counter() - start_time) * 1000
        self._response_times.append(duration_ms)

        # Update average
        if self._response_times:
            self._stats.avg_response_time_ms = sum(self._response_times) / len(self._response_times)

        if is_error:
            self._stats.total_errors += 1
            self._stats.errors_per_endpoint[endpoint] = (
                self._stats.errors_per_endpoint.get(endpoint, 0) + 1
            )

        return duration_ms

    def get_stats(self) -> dict[str, Any]:
        """Get current statistics."""
        uptime = datetime.now(UTC) - self._start_time

        return {
            "uptime_seconds": uptime.total_seconds(),
            "uptime_human": str(uptime),
            "total_requests": self._stats.total_requests,
            "total_errors": self._stats.total_errors,
            "error_rate": (
                self._stats.total_errors / self._stats.total_requests * 100
                if self._stats.total_requests > 0
                else 0.0
            ),
            "avg_response_time_ms": round(self._stats.avg_response_time_ms, 2),
            "active_requests": len(self._active_requests),
            "requests_per_endpoint": dict(
                sorted(
                    self._stats.requests_per_endpoint.items(),
                    key=lambda x: x[1],
                    reverse=True,
                )[:20]
            ),
            "errors_per_endpoint": dict(
                sorted(
                    self._stats.errors_per_endpoint.items(),
                    key=lambda x: x[1],
                    reverse=True,
                )[:10]
            ),
        }

    def reset_stats(self) -> None:
        """Reset all statistics."""
        self._stats = RequestStats()
        self._response_times.clear()
        self._start_time = datetime.now(UTC)

    # ─── Health & Config ───────────────────────────────────────────────────────

    def get_health(self) -> dict[str, Any]:
        """Get detailed health information."""
        return {
            "status": "healthy",
            "mode": settings.APP_MODE.value,
            "environment": settings.ENVIRONMENT,
            "version": settings.APP_VERSION,
            "uptime_seconds": (datetime.now(UTC) - self._start_time).total_seconds(),
        }

    def get_config(self) -> dict[str, Any]:
        """Get sanitized configuration."""
        # Only expose safe configuration values
        return {
            "app_name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "mode": settings.APP_MODE.value,
            "environment": settings.ENVIRONMENT,
            "log_level": settings.log_level_effective,
            "log_format": settings.LOG_FORMAT,
            "database_pool_size": settings.DATABASE_POOL_SIZE,
            "rate_limit_enabled": settings.RATE_LIMIT_ENABLED,
            "rate_limit_requests": settings.RATE_LIMIT_REQUESTS,
            "cors_origins": settings.CORS_ORIGINS,
        }


# ─── Global Instance ───────────────────────────────────────────────────────────

_maintenance: MaintenanceSystem | None = None


def get_maintenance() -> MaintenanceSystem:
    """Get the maintenance system singleton."""
    global _maintenance
    if _maintenance is None:
        _maintenance = MaintenanceSystem()
    return _maintenance


def reset_maintenance() -> None:
    """Reset the maintenance system (for testing)."""
    global _maintenance
    _maintenance = None
