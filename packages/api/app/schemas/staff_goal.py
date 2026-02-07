"""Staff goal schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.staff_goal import GoalPeriod, GoalType


class StaffGoalBase(BaseModel):
    """Base staff goal schema."""

    goal_type: GoalType
    period: GoalPeriod = GoalPeriod.monthly
    target_value: float = Field(..., ge=0)
    start_date: datetime
    end_date: datetime


class StaffGoalCreate(StaffGoalBase):
    """Create staff goal schema."""

    staff_id: UUID
    establishment_id: UUID


class StaffGoalUpdate(BaseModel):
    """Update staff goal schema."""

    goal_type: GoalType | None = None
    period: GoalPeriod | None = None
    target_value: float | None = Field(None, ge=0)
    start_date: datetime | None = None
    end_date: datetime | None = None


class StaffGoalResponse(StaffGoalBase):
    """Staff goal response schema."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    staff_id: UUID
    establishment_id: UUID
    current_value: float = 0.0
    progress_percentage: float = 0.0
    is_completed: bool = False
    created_at: datetime
    updated_at: datetime
