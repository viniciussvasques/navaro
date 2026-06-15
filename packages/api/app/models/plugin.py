"""Plugin and ad campaign models."""

from datetime import date, datetime
from enum import StrEnum
from uuid import UUID

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class AdPlacement(StrEnum):
    """Where the sponsored listing appears."""

    search_top = "search_top"
    search_list = "search_list"
    map_pin = "map_pin"


class AdCampaignStatus(StrEnum):
    """Campaign lifecycle status."""

    draft = "draft"
    active = "active"
    paused = "paused"
    exhausted = "exhausted"
    ended = "ended"


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

    placement: Mapped[str] = mapped_column(
        String(32),
        default=AdPlacement.search_top.value,
        nullable=False,
        doc="search_top | search_list | map_pin",
    )

    priority: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Higher = better position among sponsored",
    )

    target_radius_km: Mapped[float] = mapped_column(
        Numeric(6, 2),
        default=15,
        nullable=False,
        doc="Coverage radius from center (km)",
    )

    target_center_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    target_center_lng: Mapped[float | None] = mapped_column(Float, nullable=True)

    target_cities: Mapped[list] = mapped_column(
        JSON,
        default=list,
        nullable=False,
        doc="Optional city whitelist e.g. ['São Paulo']",
    )

    audience_config: Mapped[dict] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
        doc="gender, age_min, age_max, new_customers_only, categories",
    )

    budget_total: Mapped[float | None] = mapped_column(
        Numeric(10, 2),
        nullable=True,
        doc="Optional lifetime budget cap",
    )

    cost_per_impression: Mapped[float] = mapped_column(
        Numeric(8, 4),
        default=0.05,
        nullable=False,
        doc="BRL charged per impression",
    )

    status: Mapped[str] = mapped_column(
        String(20),
        default=AdCampaignStatus.active.value,
        nullable=False,
    )

    # ─── Relationships ─────────────────────────────────────────────────────────

    establishment = relationship(
        "Establishment",
    )

    def __repr__(self) -> str:
        return f"<AdCampaign(id={self.id}, budget_daily={self.budget_daily})>"
