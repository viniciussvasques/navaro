"""Debug endpoints (only available in maintenance mode)."""

from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException

from app.core.config import settings
from app.core.maintenance import get_maintenance
from app.core.security import verify_admin_token

router = APIRouter(prefix="/debug", tags=["Debug"])


def require_maintenance_mode() -> None:
    """Dependency to require maintenance mode."""
    if not settings.is_maintenance:
        raise HTTPException(
            status_code=404,
            detail="Not found",
        )


def require_admin_token(x_admin_token: str = Header(...)) -> None:
    """Dependency to require admin token."""
    if not verify_admin_token(x_admin_token):
        raise HTTPException(
            status_code=401,
            detail="Invalid admin token",
        )


# ─── Endpoints ─────────────────────────────────────────────────────────────────


@router.get(
    "/health",
    summary="Detailed health check",
    dependencies=[Depends(require_maintenance_mode), Depends(require_admin_token)],
)
async def get_health() -> dict[str, Any]:
    """Get detailed health information."""
    maintenance = get_maintenance()
    return maintenance.get_health()


@router.get(
    "/stats",
    summary="Request statistics",
    dependencies=[Depends(require_maintenance_mode), Depends(require_admin_token)],
)
async def get_stats() -> dict[str, Any]:
    """Get request statistics."""
    maintenance = get_maintenance()
    return maintenance.get_stats()


@router.post(
    "/stats/reset",
    summary="Reset statistics",
    dependencies=[Depends(require_maintenance_mode), Depends(require_admin_token)],
)
async def reset_stats() -> dict[str, str]:
    """Reset all statistics."""
    maintenance = get_maintenance()
    maintenance.reset_stats()
    return {"message": "Statistics reset"}


@router.get(
    "/sql-log",
    summary="SQL query log",
    dependencies=[Depends(require_maintenance_mode), Depends(require_admin_token)],
)
async def get_sql_log() -> dict[str, Any]:
    """Get recent SQL queries."""
    maintenance = get_maintenance()
    queries = maintenance.get_sql_log()
    return {
        "count": len(queries),
        "queries": queries,
    }


@router.post(
    "/sql-log/clear",
    summary="Clear SQL log",
    dependencies=[Depends(require_maintenance_mode), Depends(require_admin_token)],
)
async def clear_sql_log() -> dict[str, str]:
    """Clear SQL query log."""
    maintenance = get_maintenance()
    maintenance.clear_sql_log()
    return {"message": "SQL log cleared"}


@router.get(
    "/config",
    summary="Sanitized configuration",
    dependencies=[Depends(require_maintenance_mode), Depends(require_admin_token)],
)
async def get_config() -> dict[str, Any]:
    """Get sanitized configuration (no secrets)."""
    maintenance = get_maintenance()
    return maintenance.get_config()
