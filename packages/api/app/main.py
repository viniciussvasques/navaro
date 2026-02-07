"""Main FastAPI application entry point."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import ORJSONResponse

from app.core import (
    close_db,
    close_redis,
    get_logger,
    init_db,
    settings,
    setup_logging,
    setup_middlewares,
)

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
