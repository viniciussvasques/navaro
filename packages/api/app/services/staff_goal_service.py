"""Staff goal service."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment, AppointmentStatus
from app.models.staff_goal import GoalType, StaffGoal
from app.schemas.staff_goal import StaffGoalCreate, StaffGoalResponse, StaffGoalUpdate


class StaffGoalService:
    """Staff goal service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_goal(self, data: StaffGoalCreate) -> StaffGoal:
        """Create a new staff goal."""
        goal = StaffGoal(
            staff_id=data.staff_id,
            establishment_id=data.establishment_id,
            goal_type=data.goal_type,
            period=data.period,
            target_value=data.target_value,
            start_date=data.start_date,
            end_date=data.end_date,
        )
        self.db.add(goal)
        await self.db.commit()
        await self.db.refresh(goal)
        return goal

    async def get_goal(self, goal_id: UUID) -> StaffGoal | None:
        """Get goal by ID."""
        result = await self.db.execute(select(StaffGoal).where(StaffGoal.id == goal_id))
        return result.scalar_one_or_none()

    async def update_goal(self, goal_id: UUID, data: StaffGoalUpdate) -> StaffGoal | None:
        """Update a staff goal."""
        goal = await self.get_goal(goal_id)
        if not goal:
            return None

        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(goal, field, value)

        await self.db.commit()
        await self.db.refresh(goal)
        return goal

    async def list_staff_goals(self, staff_id: UUID) -> list[StaffGoal]:
        """List goals for a specific staff member."""
        result = await self.db.execute(
            select(StaffGoal)
            .where(StaffGoal.staff_id == staff_id)
            .order_by(StaffGoal.start_date.desc())
        )
        return list(result.scalars().all())

    async def calculate_progress(self, goal: StaffGoal) -> dict:
        """Calculate current progress for a specific goal."""
        current_value = 0.0

        if goal.goal_type == GoalType.revenue:
            # Sum of total_price
            revenue_query = select(func.sum(Appointment.total_price)).where(
                Appointment.staff_id == goal.staff_id,
                Appointment.status == AppointmentStatus.completed,
                Appointment.scheduled_at >= goal.start_date,
                Appointment.scheduled_at <= goal.end_date,
            )
            res = await self.db.execute(revenue_query)
            current_value = float(res.scalar() or 0.0)

        elif goal.goal_type == GoalType.services_count:
            # Count appointments
            count_query = select(func.count(Appointment.id)).where(
                Appointment.staff_id == goal.staff_id,
                Appointment.status == AppointmentStatus.completed,
                Appointment.scheduled_at >= goal.start_date,
                Appointment.scheduled_at <= goal.end_date,
            )
            res = await self.db.execute(count_query)
            current_value = float(res.scalar() or 0)

        elif goal.goal_type == GoalType.customer_count:
            # Count unique users
            user_query = select(func.count(func.distinct(Appointment.user_id))).where(
                Appointment.staff_id == goal.staff_id,
                Appointment.status == AppointmentStatus.completed,
                Appointment.scheduled_at >= goal.start_date,
                Appointment.scheduled_at <= goal.end_date,
            )
            res = await self.db.execute(user_query)
            current_value = float(res.scalar() or 0)

        progress_percentage = (
            (current_value / float(goal.target_value)) * 100
            if goal.target_value > 0
            else 0.0
        )
        is_completed = current_value >= float(goal.target_value)

        return {
            "current_value": current_value,
            "progress_percentage": round(progress_percentage, 2),
            "is_completed": is_completed,
        }

    async def goal_to_response(self, goal: StaffGoal) -> StaffGoalResponse:
        """Convert model to response with progress data."""
        progress = await self.calculate_progress(goal)
        return StaffGoalResponse(
            id=goal.id,
            staff_id=goal.staff_id,
            establishment_id=goal.establishment_id,
            goal_type=goal.goal_type,
            period=goal.period,
            target_value=float(goal.target_value),
            start_date=goal.start_date,
            end_date=goal.end_date,
            current_value=progress["current_value"],
            progress_percentage=progress["progress_percentage"],
            is_completed=progress["is_completed"],
            created_at=goal.created_at,
            updated_at=goal.updated_at,
        )
