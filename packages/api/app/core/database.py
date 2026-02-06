"""Database connection and session management."""

from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
import sqlalchemy.pool
import os
from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings
from app.core.maintenance import get_maintenance

# ─── Engine & Session ──────────────────────────────────────────────────────────

engine_kwargs = {
    "echo": settings.database_echo_effective,
    "pool_pre_ping": True,
}

if os.environ.get("TESTING"):
    engine_kwargs["poolclass"] = sqlalchemy.pool.NullPool
else:
    engine_kwargs["pool_size"] = settings.DATABASE_POOL_SIZE
    engine_kwargs["max_overflow"] = settings.DATABASE_MAX_OVERFLOW

engine = create_async_engine(
    settings.DATABASE_URL,
    **engine_kwargs,
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


# ─── SQL Query Logging (Maintenance Mode) ──────────────────────────────────────


if settings.is_maintenance:
    import time

    @event.listens_for(engine.sync_engine, "before_cursor_execute")
    def _before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        context._query_start_time = time.perf_counter()

    @event.listens_for(engine.sync_engine, "after_cursor_execute")
    def _after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        duration_ms = (time.perf_counter() - context._query_start_time) * 1000
        maintenance = get_maintenance()
        maintenance.log_sql_query(
            query=statement,
            params=dict(parameters) if parameters else None,
            duration_ms=duration_ms,
        )


# ─── Session Dependency ────────────────────────────────────────────────────────


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Get database session."""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


# Type alias for dependency injection
DBSession = Annotated[AsyncSession, Depends(get_db)]

# ─── Database Initialization ───────────────────────────────────────────────────


async def init_db() -> None:
    """Initialize database (create tables if not exist)."""
    import importlib

    # Import Base
    from app.models.base import Base

    # Import all model modules to register them with Base.metadata
    model_modules = [
        "app.models.user",
        "app.models.establishment",
        "app.models.service",
        "app.models.staff",
        "app.models.subscription",
        "app.models.appointment",
        "app.models.queue",
        "app.models.review",
        "app.models.payment",
        "app.models.portfolio",
        "app.models.plugin",
        "app.models.notification",
        "app.models.user_debt",
        "app.models.wallet",
    ]
    for module_name in model_modules:
        importlib.import_module(module_name)

    async with engine.begin() as conn:
        # Create tables (only for development)
        if settings.ENVIRONMENT == "development":
            await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """Close database connections."""
    await engine.dispose()
