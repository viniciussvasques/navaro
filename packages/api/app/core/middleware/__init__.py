"""Application middlewares."""

from starlette.types import ASGIApp, Receive, Scope, Send
import time
from uuid import uuid4
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.exceptions import AppException, RateLimitError
from app.core.logging import bind_context, clear_context, get_logger
from app.core.maintenance import get_maintenance
from app.core.middleware.prometheus import PrometheusMiddleware

logger = get_logger(__name__)


# ─── Request Timing Middleware ─────────────────────────────────────────────────


class RequestTimingMiddleware:
    """Add request timing and logging (ASGI implementation)."""

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = uuid4()
        method = scope["method"]
        path = scope["path"]

        # Bind context
        bind_context(
            request_id=str(request_id),
            method=method,
            path=path,
        )

        maintenance = get_maintenance()
        endpoint = f"{method} {path}"
        maintenance.start_request(request_id, endpoint)

        status_code = 500
        is_error = False

        async def send_wrapper(message: dict) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
            # 400+ dianggap error untuk log
            if status_code >= 400:
                is_error = True
        except Exception:
            is_error = True
            raise
        finally:
            duration_ms = maintenance.end_request(request_id, endpoint, is_error)

            # Log request
            if settings.is_debug or is_error:
                log_method = logger.error if is_error else logger.info
                log_method(
                    "Request completed",
                    duration_ms=round(duration_ms, 2),
                    status_code=status_code,
                )

            clear_context()


# ─── Error Handler Middleware ──────────────────────────────────────────────────


class ErrorHandlerMiddleware:
    """Global error handling middleware (ASGI implementation)."""

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        try:
            await self.app(scope, receive, send)
        except AppException as e:
            logger.warning(
                "Application exception",
                code=e.code,
                message=e.message,
                status_code=e.status_code,
            )
            from fastapi.responses import JSONResponse

            response = JSONResponse(
                status_code=e.status_code,
                content=e.to_dict(),
            )
            await response(scope, receive, send)
        except Exception as e:
            # Check for FastAPI/Pydantic validation errors
            from fastapi.exceptions import RequestValidationError
            from fastapi.responses import JSONResponse

            if isinstance(e, RequestValidationError):
                logger.warning("Validation error", errors=e.errors())
                response = JSONResponse(
                    status_code=422,
                    content={"detail": e.errors()},
                )
                await response(scope, receive, send)
                return

            logger.exception("Unhandled exception", error=str(e))

            # In debug mode, show full error
            if settings.is_debug:
                content = {
                    "error": {
                        "code": "INTERNAL_ERROR",
                        "message": str(e),
                        "type": type(e).__name__,
                    }
                }
            else:
                content = {
                    "error": {
                        "code": "INTERNAL_ERROR",
                        "message": "Erro interno do servidor",
                    }
                }

            response = JSONResponse(
                status_code=500,
                content=content,
            )
            await response(scope, receive, send)


# ─── Rate Limiting Middleware ──────────────────────────────────────────────────


class RateLimitMiddleware:
    """Simple in-memory rate limiting (ASGI implementation)."""

    def __init__(self, app: ASGIApp):
        self.app = app
        self._requests: dict[str, list[float]] = {}

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        if not settings.RATE_LIMIT_ENABLED:
            await self.app(scope, receive, send)
            return

        # Skip rate limiting for health checks
        path = scope["path"]
        if path in ("/health", "/debug/health"):
            await self.app(scope, receive, send)
            return

        # Get client IP
        client = scope.get("client")
        client_ip = client[0] if client else "unknown"

        # Check X-Forwarded-For
        headers = dict(scope.get("headers", []))
        forwarded = headers.get(b"x-forwarded-for")
        if forwarded:
            client_ip = forwarded.decode().split(",")[0].strip()

        # Check rate limit
        now = time.time()
        window_start = now - settings.RATE_LIMIT_WINDOW_SECONDS

        # Clean old requests
        if client_ip in self._requests:
            self._requests[client_ip] = [t for t in self._requests[client_ip] if t > window_start]
        else:
            self._requests[client_ip] = []

        # Check limit
        if len(self._requests[client_ip]) >= settings.RATE_LIMIT_REQUESTS:
            # Raise RateLimitError which is handled by ErrorHandlerMiddleware
            # Since ErrorHandler wraps this, exception will bubble up
            raise RateLimitError(retry_after=settings.RATE_LIMIT_WINDOW_SECONDS)

        # Record request
        self._requests[client_ip].append(now)

        await self.app(scope, receive, send)


# ─── Setup Middlewares ─────────────────────────────────────────────────────────


def setup_middlewares(app: FastAPI) -> None:
    """Configure all middlewares for the application."""

    # CORS (must be first)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
        allow_methods=settings.CORS_ALLOW_METHODS,
        allow_headers=settings.CORS_ALLOW_HEADERS,
    )

    # Rate limiting
    app.add_middleware(RateLimitMiddleware)

    # Error handling
    app.add_middleware(ErrorHandlerMiddleware)
    
    # Prometheus metrics
    app.add_middleware(PrometheusMiddleware)

    # Request timing (must be last to wrap everything)
    app.add_middleware(RequestTimingMiddleware)
