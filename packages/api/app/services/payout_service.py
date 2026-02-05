"""Payout service."""

from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payment import Payment, PaymentStatus, Payout


class PayoutService:
    """Payout service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_withdrawable_balance(self, establishment_id: UUID) -> float:
        """
        Calculate available balance for payout.
        Basically: Sum(Payment.net_amount) - Sum(Payout.amount)
        """
        # 1. Total Net Revenue
        revenue_query = select(func.sum(Payment.net_amount)).where(
            and_(
                Payment.establishment_id == establishment_id,
                Payment.status == PaymentStatus.succeeded,
            )
        )
        revenue_res = await self.db.execute(revenue_query)
        total_net_revenue = float(revenue_res.scalar() or 0)

        # 2. Total Paid Out
        payout_query = select(func.sum(Payout.amount)).where(
            and_(Payout.establishment_id == establishment_id, Payout.status == "paid")
        )
        payout_res = await self.db.execute(payout_query)
        total_payouts = float(payout_res.scalar() or 0)

        return max(0.0, total_net_revenue - total_payouts)

    async def request_payout(self, establishment_id: UUID, amount: float) -> Payout:
        """Create a payout request."""
        available = await self.get_withdrawable_balance(establishment_id)

        if amount > available:
            raise ValueError(f"Saldo insuficiente. Disponível: R$ {available:.2f}")

        if amount < 50.0:
            raise ValueError("O valor mínimo para saque é R$ 50,00")

        payout = Payout(establishment_id=establishment_id, amount=amount, status="pending")
        self.db.add(payout)
        await self.db.commit()
        await self.db.refresh(payout)
        return payout

    async def list_payouts(self, establishment_id: UUID) -> list[Payout]:
        """List payout history."""
        query = (
            select(Payout)
            .where(Payout.establishment_id == establishment_id)
            .order_by(Payout.created_at.desc())
        )
        result = await self.db.execute(query)
        return result.scalars().all()
