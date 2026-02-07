"""Business metrics module."""

import time
from typing import Any

from prometheus_client import Counter, Gauge, Histogram

from app.core.logging import get_logger

logger = get_logger("metrics")

# Define Prometheus metrics
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status_code"],
)

REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
)

ACTIVE_REQUESTS = Gauge(
    "http_requests_active",
    "Active HTTP requests",
    ["method", "endpoint"],
)

BUSINESS_EVENTS = Counter(
    "business_events_total",
    "Total business events",
    ["event_type"],
)


class Metrics:
    """
    Business metrics wrapper using Prometheus.
    Also logs events for debugging/tracing.
    """

    @staticmethod
    def count(name: str, value: int = 1, tags: dict[str, Any] | None = None) -> None:
        """Increment a counter."""
        tags = tags or {}
        # Log for trace visibility
        logger.info(
            "metric_count", metric_name=name, metric_value=value, metric_type="count", **tags
        )
        
        # Map specific business events to Prometheus
        # Implementation can be expanded based on 'name'
        if tags.get("event_type"):
            BUSINESS_EVENTS.labels(event_type=tags["event_type"]).inc(value)

    @staticmethod
    def gauge(name: str, value: float, tags: dict[str, Any] | None = None) -> None:
        """Set a gauge value."""
        tags = tags or {}
        logger.info(
            "metric_gauge", metric_name=name, metric_value=value, metric_type="gauge", **tags
        )

    @staticmethod
    def measure_time(name: str, duration_sec: float, tags: dict[str, Any] | None = None) -> None:
        """Record a timing metric."""
        tags = tags or {}
        logger.info(
            "metric_timer", metric_name=name, metric_value=duration_sec, metric_type="timer", **tags
        )


metrics = Metrics()
