"""Database compatibility layer."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import (
    async_session_maker as AsyncSessionLocal,
)
from app.core.database import engine, get_db, init_db
from app.models.base import Base

__all__ = [
    "AsyncSession",
    "AsyncSessionLocal",
    "Base",
    "engine",
    "get_db",
    "init_db",
]
