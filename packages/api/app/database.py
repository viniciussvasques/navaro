"""Database compatibility layer."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_maker, engine, get_db, init_db
from app.models.base import Base

AsyncSessionLocal = async_session_maker

__all__ = [
    "AsyncSession",
    "AsyncSessionLocal",
    "Base",
    "engine",
    "get_db",
    "init_db",
]
