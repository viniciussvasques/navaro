"""Portfolio and search history models."""

from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.establishment import Establishment
    from app.models.staff import StaffMember


class PortfolioImage(BaseModel):
    """
    Portfolio image model.

    Represents an image showcasing work done.
    """

    __tablename__ = "portfolio_images"

    # ─── Foreign Keys ──────────────────────────────────────────────────────────

    establishment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("establishments.id"),
        nullable=False,
        index=True,
        doc="Establishment ID",
    )

    staff_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("staff_members.id"),
        index=True,
        doc="Staff member who did the work (optional)",
    )

    # ─── Image Info ────────────────────────────────────────────────────────────

    image_url: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        doc="Image URL",
    )

    thumbnail_url: Mapped[str | None] = mapped_column(
        String(500),
        doc="Thumbnail URL",
    )

    description: Mapped[str | None] = mapped_column(
        String(500),
        doc="Image description",
    )

    # ─── Relationships ─────────────────────────────────────────────────────────

    establishment: Mapped["Establishment"] = relationship(
        "Establishment",
        back_populates="portfolio_images",
    )

    staff: Mapped["StaffMember | None"] = relationship(
        "StaffMember",
        back_populates="portfolio_images",
    )

    def __repr__(self) -> str:
        return f"<PortfolioImage(id={self.id})>"


class SearchHistory(BaseModel):
    """
    Search history model.

    Tracks user's search history.
    """

    __tablename__ = "search_history"

    # ─── Foreign Keys ──────────────────────────────────────────────────────────

    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
        doc="User ID",
    )

    establishment_clicked_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("establishments.id"),
        doc="Establishment clicked from search (if any)",
    )

    # ─── Search Info ───────────────────────────────────────────────────────────

    query: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Search query",
    )

    # ─── Relationships ─────────────────────────────────────────────────────────

    user = relationship(
        "User",
    )

    establishment_clicked = relationship(
        "Establishment",
    )

    # ─── Indexes ───────────────────────────────────────────────────────────────

    __table_args__ = (Index("idx_search_history_user_date", "user_id", "created_at"),)

    def __repr__(self) -> str:
        return f"<SearchHistory(id={self.id}, query={self.query})>"
