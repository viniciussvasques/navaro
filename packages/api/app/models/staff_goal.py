"""Staff goal model."""

import enum
from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import BaseModel


class GoalType(str, enum.Enum):
    """Staff goal type."""

    revenue = "revenue"  # Total revenue generated
    services_count = "services_count"  # Number of services performed
    customer_count = "customer_count"  # Unique customers served


class GoalPeriod(str, enum.Enum):
    """Staff goal period."""

    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"


class StaffGoal(BaseModel):
    """
    Staff goal model.

    Represents a performance target for a staff member.
    """

    __tablename__ = "staff_goals"

    # ─── Foreign Keys ──────────────────────────────────────────────────────────

    staff_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("staff_members.id"),
        nullable=False,
        index=True,
        doc="Staff member ID",
    )

    establishment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("establishments.id"),
        nullable=False,
        index=True,
        doc="Establishment ID",
    )

    # ─── Goal Info ─────────────────────────────────────────────────────────────

    goal_type: Mapped[GoalType] = mapped_column(
        Enum(GoalType),
        nullable=False,
        doc="Type of goal (revenue, services, etc.)",
    )

    period: Mapped[GoalPeriod] = mapped_column(
        Enum(GoalPeriod),
        default=GoalPeriod.monthly,
        nullable=False,
        doc="Time period for the goal",
    )

    target_value: Mapped[float] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        doc="Numerical target for the goal",
    )

    current_value: Mapped[float] = mapped_column(
        Numeric(12, 2),
        default=0.0,
        nullable=False,
        doc="Current progress towards the goal",
    )

    start_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        doc="Goal start period",
    )

    end_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        doc="Goal end period",
    )

    # ─── Relationships ─────────────────────────────────────────────────────────

    staff = relationship(
        "StaffMember",
        # back_populates="goals", # Will add to StaffMember if needed
    )

    establishment = relationship(
        "Establishment",
    )

    def __repr__(self) -> str:
        return f"<StaffGoal(staff_id={self.staff_id}, type={self.goal_type.value}, target={self.target_value})>"
