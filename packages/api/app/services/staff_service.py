import logging
from datetime import datetime, date
from uuid import UUID
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.staff import StaffMember
from app.models.staff_goal import StaffGoal, GoalType
from app.models.wallet import UserWallet, TransactionType
from app.services.wallet_service import WalletService

logger = logging.getLogger(__name__)

class StaffService:
    """Service for managing staff operations (commissions, goals)."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.wallet_service = WalletService(db)

    async def record_service_completion(
        self, staff_id: UUID, establishment_id: UUID, amount: float, appointment_id: UUID
    ) -> None:
        """Record service completion to update goals and commissions."""
        staff_result = await self.db.execute(
            select(StaffMember).where(StaffMember.id == staff_id)
        )
        staff = staff_result.scalar_one_or_none()
        if not staff:
            return

        # 1. Calculate and Record Commission
        if staff.commission_rate and staff.commission_rate > 0:
            commission = amount * (float(staff.commission_rate) / 100.0)
            if staff.user_id:
                await self.wallet_service.add_balance(
                    user_id=staff.user_id,
                    amount=commission,
                    description=f"Comissão de serviço: {appointment_id}",
                    reference_id=str(appointment_id),
                    tx_type=TransactionType.commission
                )

        # 2. Update Goals
        today = datetime.now()
        goals_result = await self.db.execute(
            select(StaffGoal).where(
                and_(
                    StaffGoal.staff_id == staff_id,
                    StaffGoal.start_date <= today,
                    StaffGoal.end_date >= today
                )
            )
        )
        goals = goals_result.scalars().all()
        
        for goal in goals:
            if goal.goal_type == GoalType.revenue:
                goal.current_value = float(goal.current_value) + amount
            elif goal.goal_type == GoalType.services_count:
                goal.current_value = float(goal.current_value) + 1
            # Add other goal types as needed

        await self.db.flush()
