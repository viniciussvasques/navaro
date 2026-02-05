"""Healthcheck endpoints for production monitoring."""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db

router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    timestamp: str
    version: str


class ReadinessResponse(BaseModel):
    """Readiness check response with dependencies."""

    status: str
    timestamp: str
    version: str
    checks: dict[str, bool]


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Liveness probe endpoint.

    Returns 200 if the service is running.
    Used by Kubernetes/Docker for liveness probes.
    """
    settings = get_settings()
    return {
        "status": "healthy",
        "timestamp": datetime.now(UTC).isoformat(),
        "version": settings.APP_VERSION,
    }


@router.get("/ready", response_model=ReadinessResponse)
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """
    Readiness probe endpoint.

    Checks all critical dependencies:
    - Database connection
    - Redis connection (if configured)

    Returns 200 only if all dependencies are healthy.
    Returns 503 if any dependency is unhealthy.
    """
    settings = get_settings()
    checks = {}
    all_healthy = True

    # Check database
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = True
    except Exception:
        checks["database"] = False
        all_healthy = False

    # Check Redis (optional)
    try:
        import redis.asyncio as aioredis

        redis_client = aioredis.from_url(settings.REDIS_URL)
        await redis_client.ping()
        await redis_client.close()
        checks["redis"] = True
    except Exception:
        checks["redis"] = False
        # Redis is optional, don't fail readiness

    from fastapi import HTTPException, status

    if not all_healthy:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "unhealthy",
                "timestamp": datetime.now(UTC).isoformat(),
                "version": settings.APP_VERSION,
                "checks": checks,
            },
        )

    return {
        "status": "ready",
        "timestamp": datetime.now(UTC).isoformat(),
        "version": settings.APP_VERSION,
        "checks": checks,
    }


@router.get("/metrics")
async def metrics():
    """
    Prometheus metrics endpoint.

    Returns basic application metrics.
    """
    # Basic metrics - can be extended with prometheus_client
    return {
        "uptime_seconds": 0,  # Would need to track start time
        "requests_total": 0,  # Would need middleware counter
        "active_connections": 0,
    }
