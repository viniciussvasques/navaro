"""Prometheus metrics middleware."""

import time

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response
from starlette.routing import Match

from app.core.metrics import ACTIVE_REQUESTS, REQUEST_COUNT, REQUEST_LATENCY


class PrometheusMiddleware(BaseHTTPMiddleware):
    """Middleware to track Prometheus metrics."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        """Process request and record metrics."""
        method = request.method
        path_template = self._get_path_template(request)

        # Skip health check and metrics endpoints to avoid noise
        if path_template in ["/health", "/metrics", "/openapi.json", "/docs"]:
            return await call_next(request)

        ACTIVE_REQUESTS.labels(method=method, endpoint=path_template).inc()
        start_time = time.time()

        try:
            response = await call_next(request)
            status_code = str(response.status_code)
        except Exception:
            status_code = "500"
            raise
        finally:
            duration = time.time() - start_time
            ACTIVE_REQUESTS.labels(method=method, endpoint=path_template).dec()
            REQUEST_COUNT.labels(
                method=method, endpoint=path_template, status_code=status_code
            ).inc()
            REQUEST_LATENCY.labels(method=method, endpoint=path_template).observe(duration)

        return response

    @staticmethod
    def _get_path_template(request: Request) -> str:
        """Get the path template (e.g., /users/{id}) instead of actual path."""
        for route in request.app.routes:
            match, _ = route.matches(request.scope)
            if match == Match.FULL:
                return route.path
        return request.url.path
