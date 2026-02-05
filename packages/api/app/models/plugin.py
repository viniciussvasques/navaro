"""Plugin and ad campaign models."""

from datetime import date, datetime
from uuid import UUID

from sqlalchemy import JSON, Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class EstablishmentPlugin(BaseModel):
    """
    Establishment plugin model.

    Represents an installed plugin for an establishment.
    """

    __tablename__ = "establishment_plugins"

    # ─── Foreign Keys ──────────────────────────────────────────────────────────

    establishment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("establishments.id"),
        nullable=False,
        index=True,
        doc="Establishment ID",
    )

    # ─── Plugin Info ───────────────────────────────────────────────────────────

    plugin_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        doc="Plugin type (ads, marketing, analytics)",
    )

    active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="Is plugin active",
    )

    config: Mapped[dict] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
        doc="Plugin configuration",
    )

    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        doc="Plugin expiration date",
    )

    # ─── Relationships ─────────────────────────────────────────────────────────

    establishment = relationship(
        "Establishment",
    )

    def __repr__(self) -> str:
        return f"<EstablishmentPlugin(id={self.id}, type={self.plugin_type})>"


class AdCampaign(BaseModel):
    """
    Ad campaign model.

    Represents an advertising campaign to boost visibility.
    """

    __tablename__ = "ad_campaigns"

    # ─── Foreign Keys ──────────────────────────────────────────────────────────

    establishment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("establishments.id"),
        nullable=False,
        index=True,
        doc="Establishment ID",
    )

    # ─── Campaign Info ─────────────────────────────────────────────────────────

    name: Mapped[str | None] = mapped_column(
        String(200),
        doc="Campaign name",
    )

    budget_daily: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        doc="Daily budget",
    )

    spent_today: Mapped[float] = mapped_column(
        Numeric(10, 2),
        default=0,
        nullable=False,
        doc="Amount spent today",
    )

    total_spent: Mapped[float] = mapped_column(
        Numeric(10, 2),
        default=0,
        nullable=False,
        doc="Total amount spent",
    )

    # ─── Metrics ───────────────────────────────────────────────────────────────

    impressions: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Number of impressions",
    )

    clicks: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Number of clicks",
    )

    # ─── Schedule ──────────────────────────────────────────────────────────────

    start_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        doc="Campaign start date",
    )

    end_date: Mapped[date | None] = mapped_column(
        Date,
        doc="Campaign end date (optional)",
    )

    active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="Is campaign active",
    )

    # ─── Relationships ─────────────────────────────────────────────────────────

    establishment = relationship(
        "Establishment",
    )

    def __repr__(self) -> str:
        return f"<AdCampaign(id={self.id}, budget_daily={self.budget_daily})>"
