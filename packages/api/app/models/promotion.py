"""Promotion models (MVP 1.1 — B110)."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class Promotion(BaseModel):
    """Establishment promotion / discount campaign."""

    __tablename__ = "promotions"

    establishment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("establishments.id"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    discount_percent: Mapped[float | None] = mapped_column(Numeric(5, 2))
    discount_fixed: Mapped[float | None] = mapped_column(Numeric(10, 2))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notify_sent: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    establishment = relationship("Establishment")
