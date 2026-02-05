"""Queue entry model."""

import enum
from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import Integer, ForeignKey, Enum, DateTime, Index
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.establishment import Establishment
    from app.models.staff import StaffMember
    from app.models.service import Service


class QueueStatus(str, enum.Enum):
    """Queue entry status."""

    WAITING = "waiting"
    CALLED = "called"
    SERVING = "serving"
    COMPLETED = "completed"
    LEFT = "left"


class QueueEntry(BaseModel):
    """
    Queue entry model.
    
    Represents a customer waiting in line (queue mode).
    """

    __tablename__ = "queue_entries"

    # ─── Foreign Keys ──────────────────────────────────────────────────────────
    
    establishment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("establishments.id"),
        nullable=False,
        index=True,
        doc="Establishment ID",
    )
    
    user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
        doc="Customer user ID",
    )
    
    service_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("services.id"),
        doc="Requested service (optional)",
    )
    
    preferred_staff_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("staff_members.id"),
        doc="Preferred staff member (optional)",
    )
    
    assigned_staff_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("staff_members.id"),
        doc="Actually assigned staff member",
    )

    # ─── Queue Data ────────────────────────────────────────────────────────────
    
    position: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="Position in queue",
    )
    
    status: Mapped[QueueStatus] = mapped_column(
        Enum(QueueStatus),
        default=QueueStatus.WAITING,
        nullable=False,
        index=True,
        doc="Queue status",
    )

    # ─── Timestamps ────────────────────────────────────────────────────────────
    
    entered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        doc="When customer entered queue",
    )
    
    called_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        doc="When customer was called",
    )
    
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        doc="When service started",
    )
    
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        doc="When service completed",
    )

    # ─── Relationships ─────────────────────────────────────────────────────────
    
    establishment: Mapped["Establishment"] = relationship(
        "Establishment",
        back_populates="queue_entries",
    )
    
    user = relationship(
        "User",
    )
    
    service = relationship(
        "Service",
    )
    
    preferred_staff: Mapped["StaffMember | None"] = relationship(
        "StaffMember",
        foreign_keys=[preferred_staff_id],
    )
    
    assigned_staff: Mapped["StaffMember | None"] = relationship(
        "StaffMember",
        foreign_keys=[assigned_staff_id],
    )

    # ─── Indexes ───────────────────────────────────────────────────────────────
    
    __table_args__ = (
        Index("idx_queue_establishment_status", "establishment_id", "status"),
        Index("idx_queue_establishment_position", "establishment_id", "position"),
    )

    def __repr__(self) -> str:
        return f"<QueueEntry(id={self.id}, position={self.position}, status={self.status.value})>"
