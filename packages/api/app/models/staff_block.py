"""Staff block model."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class StaffBlock(BaseModel):
    """
    Staff block model.

    Represents a period where a staff member is unavailable
    (lunch, vacation, doctor appointment, etc.).
    """

    __tablename__ = "staff_blocks"

    # ─── Foreign Keys ──────────────────────────────────────────────────────────

    staff_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("staff_members.id"),
        nullable=False,
        index=True,
        doc="Staff member ID",
    )

    # ─── Block Info ───────────────────────────────────────────────────────────

    start_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
        doc="Start of the block",
    )

    end_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
        doc="End of the block",
    )

    reason: Mapped[str | None] = mapped_column(
        String(200),
        doc="Reason for the block (optional)",
    )

    # ─── Relationships ─────────────────────────────────────────────────────────

    staff = relationship("StaffMember", backref="blocks")

    # ─── Indexes ───────────────────────────────────────────────────────────────

    __table_args__ = (Index("idx_staff_blocks_time_range", "staff_id", "start_at", "end_at"),)

    def __repr__(self) -> str:
        return f"<StaffBlock(id={self.id}, staff_id={self.staff_id}, range={self.start_at}-{self.end_at})>"
