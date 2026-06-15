"""Main FastAPI application entry point."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, ORJSONResponse

from app.core import (
    close_db,
    close_redis,
    get_logger,
    init_db,
    settings,
    setup_logging,
    setup_middlewares,
)
from app.core.exceptions import AppException

# ─── Application Lifespan ──────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan handler."""
    logger = get_logger("app.main")

    # Startup
    logger.info(
        "Starting application",
        name=settings.APP_NAME,
        version=settings.APP_VERSION,
        mode=settings.APP_MODE.value,
        environment=settings.ENVIRONMENT,
    )

    await init_db()
    logger.info("Database initialized")

    yield

    # Shutdown
    logger.info("Shutting down application")
    await close_db()
    logger.info("Database connections closed")
    await close_redis()
    logger.info("Redis connections closed")


# ─── Helpers ───────────────────────────────────────────────────────────────────


def _json_safe(value: object) -> object:
    """Converte valores não serializáveis (ex.: bytes no input de validação) para JSON."""
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    if isinstance(value, dict):
        return {str(k): _json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    return value


def _status_to_code(status_code: int) -> str:
    """Map HTTP status code to error code string."""
    if status_code == 400:
        return "BAD_REQUEST"
    if status_code == 401:
        return "UNAUTHORIZED"
    if status_code == 403:
        return "FORBIDDEN"
    if status_code == 404:
        return "NOT_FOUND"
    if status_code == 409:
        return "CONFLICT"
    if status_code == 422:
        return "VALIDATION_ERROR"
    if status_code == 429:
        return "RATE_LIMIT_EXCEEDED"
    if status_code >= 500:
        return "INTERNAL_ERROR"
    return "ERROR"


# ─── Application Factory ───────────────────────────────────────────────────────


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    # Setup logging first
    setup_logging()

    # Create app with optimal settings
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="API para sistema de agendamento de barbearias e salões",
        docs_url="/docs" if settings.is_debug else None,
        redoc_url="/redoc" if settings.is_debug else None,
        openapi_url="/openapi.json" if settings.is_debug else None,
        default_response_class=ORJSONResponse,
        lifespan=lifespan,
    )

    # ─── Exception handlers (resposta unificada: {"error": {"code", "message"}}) ───

    @app.exception_handler(AppException)
    def app_exception_handler(_request: Request, exc: AppException) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content=exc.to_dict())

    @app.exception_handler(RequestValidationError)
    def validation_exception_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
        errors = [_json_safe(err) for err in exc.errors()]
        # Mensagem amigável: primeiro erro ou "Dados inválidos"
        first_msg = errors[0].get("msg", "Dados inválidos") if errors else "Dados inválidos"
        loc = errors[0].get("loc", []) if errors else []
        field = str(loc[-1]) if len(loc) > 1 else None
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": first_msg,
                    "field": field,
                    "details": errors,
                }
            },
        )

    @app.exception_handler(HTTPException)
    def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
        detail = exc.detail
        if isinstance(detail, str):
            message = detail
        elif isinstance(detail, dict):
            message = detail.get("message", detail.get("msg", str(detail)))
        else:
            message = str(detail) if detail else "Erro na requisição"
        code = _status_to_code(exc.status_code)
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": code, "message": message}},
        )

    @app.exception_handler(ValueError)
    def value_error_handler(_request: Request, exc: ValueError) -> JSONResponse:
        return JSONResponse(
            status_code=400,
            content={
                "error": {
                    "code": "BAD_REQUEST",
                    "message": str(exc) or "Requisição inválida",
                }
            },
        )

    # Setup middlewares
    setup_middlewares(app)

    # Include routers
    _include_routers(app)

    return app


def _include_routers(app: FastAPI) -> None:
    """Include all API routers."""

    # Health check (always available)
    @app.get("/health", tags=["Health"])
    async def health_check() -> dict[str, str]:
        """Simple health check endpoint."""
        return {
            "status": "healthy",
            "version": settings.APP_VERSION,
        }

    @app.get("/metrics", tags=["Monitoring"])
    async def metrics():
        """Prometheus metrics endpoint."""
        from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
        from fastapi.responses import Response

        return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

    # API v1 routes
    from app.api.v1 import router as v1_router

    app.include_router(v1_router)

    # Debug routes (only in maintenance mode)
    if settings.is_maintenance:
        from app.api.debug import router as debug_router

        app.include_router(debug_router)


# ─── Application Instance ──────────────────────────────────────────────────────


app = create_app()


# ─── CLI Entry Point ───────────────────────────────────────────────────────────


def run() -> None:
    """Run the application with uvicorn."""
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        workers=settings.WORKERS,
        reload=settings.is_debug,
        log_level=settings.log_level_effective.lower(),
    )


if __name__ == "__main__":
    run()
