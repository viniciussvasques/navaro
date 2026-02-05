"""Base model with common fields."""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


# ─── SQLAlchemy Base ───────────────────────────────────────────────────────────


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""

    pass


# ─── BaseModel ─────────────────────────────────────────────────────────────────


class BaseModel(Base):
    """
    Base model with common fields.
    
    All models should inherit from this class to get:
    - UUID primary key
    - created_at timestamp
    - updated_at timestamp (auto-updated)
    """

    __abstract__ = True

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        doc="Unique identifier",
    )
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Creation timestamp",
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        doc="Last update timestamp",
    )

    def __repr__(self) -> str:
        """String representation."""
        return f"<{self.__class__.__name__}(id={self.id})>"

