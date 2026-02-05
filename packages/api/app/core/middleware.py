"""Application middlewares."""

import time
from typing import Callable
from uuid import uuid4

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.exceptions import AppException, RateLimitError
from app.core.logging import bind_context, clear_context, get_logger
from app.core.maintenance import get_maintenance


logger = get_logger(__name__)


# ─── Request Timing Middleware ─────────────────────────────────────────────────


class RequestTimingMiddleware(BaseHTTPMiddleware):
    """Add request timing and logging."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = uuid4()
        start_time = time.perf_counter()
        
        # Bind context for logging
        bind_context(
            request_id=str(request_id),
            method=request.method,
            path=request.url.path,
        )
        
        # Track in maintenance system
        maintenance = get_maintenance()
        endpoint = f"{request.method} {request.url.path}"
        maintenance.start_request(request_id, endpoint)
        
        is_error = False
        try:
            response = await call_next(request)
            is_error = response.status_code >= 400
            return response
        except Exception:
            is_error = True
            raise
        finally:
            duration_ms = maintenance.end_request(request_id, endpoint, is_error)
            
            # Log request (only in debug mode or for errors)
            if settings.is_debug or is_error:
                log_method = logger.error if is_error else logger.info
                log_method(
                    "Request completed",
                    duration_ms=round(duration_ms, 2),
                    status_code=getattr(response, "status_code", 500) if "response" in dir() else 500,
                )
            
            # Add timing header
            if "response" in dir():
                response.headers["X-Request-ID"] = str(request_id)
                response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"
            
            clear_context()


# ─── Error Handler Middleware ──────────────────────────────────────────────────


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """Global error handling middleware."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        try:
            return await call_next(request)
        except AppException as e:
            logger.warning(
                "Application exception",
                code=e.code,
                message=e.message,
                status_code=e.status_code,
            )
            
            from fastapi.responses import JSONResponse
            return JSONResponse(
                status_code=e.status_code,
                content=e.to_dict(),
            )
        except Exception as e:
            logger.exception("Unhandled exception", error=str(e))
            
            from fastapi.responses import JSONResponse
            
            # In debug mode, show full error
            if settings.is_debug:
                return JSONResponse(
                    status_code=500,
                    content={
                        "error": {
                            "code": "INTERNAL_ERROR",
                            "message": str(e),
                            "type": type(e).__name__,
                        }
                    },
                )
            
            return JSONResponse(
                status_code=500,
                content={
                    "error": {
                        "code": "INTERNAL_ERROR",
                        "message": "Erro interno do servidor",
                    }
                },
            )


# ─── Rate Limiting Middleware ──────────────────────────────────────────────────


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiting (use Redis in production)."""

    def __init__(self, app: FastAPI) -> None:
        super().__init__(app)
        self._requests: dict[str, list[float]] = {}

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)
        
        # Skip rate limiting for health checks
        if request.url.path in ("/health", "/debug/health"):
            return await call_next(request)
        
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        
        # Check rate limit
        now = time.time()
        window_start = now - settings.RATE_LIMIT_WINDOW_SECONDS
        
        # Clean old requests
        if client_ip in self._requests:
            self._requests[client_ip] = [
                t for t in self._requests[client_ip] if t > window_start
            ]
        else:
            self._requests[client_ip] = []
        
        # Check limit
        if len(self._requests[client_ip]) >= settings.RATE_LIMIT_REQUESTS:
            raise RateLimitError(retry_after=settings.RATE_LIMIT_WINDOW_SECONDS)
        
        # Record request
        self._requests[client_ip].append(now)
        
        return await call_next(request)


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
    
    # Request timing (must be last to wrap everything)
    app.add_middleware(RequestTimingMiddleware)
