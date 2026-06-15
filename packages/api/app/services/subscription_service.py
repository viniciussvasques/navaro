"""Customer and owner subscription operations."""

from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BusinessError, NotFoundError
from app.models.subscription import (
    Subscription,
    SubscriptionPlan,
    SubscriptionStatus,
    SubscriptionUsage,
)
from app.models.user import User
from app.schemas.subscription import SubscriptionUsageResponse
from app.services.wallet_service import WalletService


class SubscriptionService:
    """Manage user subscriptions to establishment plans."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _load_plan(self, plan_id: UUID) -> SubscriptionPlan:
        result = await self.db.execute(
            select(SubscriptionPlan)
            .where(SubscriptionPlan.id == plan_id, SubscriptionPlan.active == True)
            .options(selectinload(SubscriptionPlan.items))
        )
        plan = result.scalar_one_or_none()
        if not plan:
            raise NotFoundError("Plano de assinatura")
        if not plan.items:
            raise BusinessError("INVALID_PLAN", "Plano sem itens configurados")
        return plan

    def _month_start(self, dt: datetime) -> datetime:
        return dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0, tzinfo=UTC)

    def _period_end(self, start: datetime) -> datetime:
        return start + timedelta(days=30)

    async def _max_uses_for_plan(self, plan: SubscriptionPlan) -> int:
        return sum(item.quantity_per_month for item in plan.items)

    async def _usage_for_subscription(self, subscription: Subscription) -> SubscriptionUsageResponse:
        month_start = self._month_start(datetime.now(UTC)).date()
        result = await self.db.execute(
            select(func.coalesce(func.sum(SubscriptionUsage.uses_this_month), 0)).where(
                SubscriptionUsage.subscription_id == subscription.id,
                SubscriptionUsage.month_start == month_start,
            )
        )
        uses = int(result.scalar() or 0)
        plan_result = await self.db.execute(
            select(SubscriptionPlan)
            .where(SubscriptionPlan.id == subscription.plan_id)
            .options(selectinload(SubscriptionPlan.items))
        )
        plan = plan_result.scalar_one()
        max_uses = await self._max_uses_for_plan(plan)
        return SubscriptionUsageResponse(
            uses_this_month=uses,
            max_uses_per_month=max_uses,
            period_start=subscription.current_period_start,
            period_end=subscription.current_period_end,
        )

    async def _init_usage_rows(self, subscription: Subscription, plan: SubscriptionPlan) -> None:
        month_start = self._month_start(datetime.now(UTC)).date()
        for item in plan.items:
            self.db.add(
                SubscriptionUsage(
                    subscription_id=subscription.id,
                    plan_item_id=item.id,
                    month_start=month_start,
                    uses_this_month=0,
                )
            )

    async def list_user_subscriptions(self, user_id: UUID) -> list[Subscription]:
        result = await self.db.execute(
            select(Subscription)
            .where(Subscription.user_id == user_id)
            .options(selectinload(Subscription.plan))
            .order_by(Subscription.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_user_subscription(self, user_id: UUID, subscription_id: UUID) -> Subscription | None:
        result = await self.db.execute(
            select(Subscription)
            .where(Subscription.id == subscription_id, Subscription.user_id == user_id)
            .options(selectinload(Subscription.plan))
        )
        return result.scalar_one_or_none()

    async def subscribe(
        self,
        user_id: UUID,
        plan_id: UUID,
        payment_method: str = "wallet",
        payment_method_id: str | None = None,
    ) -> Subscription:
        plan = await self._load_plan(plan_id)

        existing = await self.db.execute(
            select(Subscription).where(
                Subscription.user_id == user_id,
                Subscription.plan_id == plan_id,
                Subscription.status == SubscriptionStatus.active,
            )
        )
        if existing.scalar_one_or_none():
            raise BusinessError("ALREADY_SUBSCRIBED", "Você já possui assinatura ativa deste plano")

        price = float(plan.price)
        if payment_method == "wallet":
            wallet = WalletService(self.db)
            try:
                await wallet.withdraw_balance(
                    user_id=user_id,
                    amount=price,
                    description=f"Assinatura: {plan.name}",
                    reference_id=str(plan.id),
                )
            except ValueError as e:
                raise BusinessError("INSUFFICIENT_BALANCE", str(e)) from e
        elif payment_method == "stripe":
            if not payment_method_id:
                raise BusinessError("INVALID_INPUT", "payment_method_id obrigatório para Stripe")
            raise BusinessError("NOT_IMPLEMENTED", "Pagamento Stripe para assinatura ainda não configurado")
        elif payment_method == "mercadopago":
            raise BusinessError(
                "USE_PAY_INTENT",
                "Use POST /subscriptions/pay-intent para pagar via Mercado Pago",
            )
        else:
            raise BusinessError("INVALID_PAYMENT_METHOD", "Método de pagamento inválido")

        return await self._activate_subscription(user_id, plan)

    async def _activate_subscription(self, user_id: UUID, plan: SubscriptionPlan) -> Subscription:
        now = datetime.now(UTC)
        subscription = Subscription(
            user_id=user_id,
            plan_id=plan.id,
            establishment_id=plan.establishment_id,
            status=SubscriptionStatus.active,
            current_period_start=now,
            current_period_end=self._period_end(now),
        )
        self.db.add(subscription)
        await self.db.flush()
        await self._init_usage_rows(subscription, plan)
        await self.db.commit()
        await self.db.refresh(subscription)

        result = await self.db.execute(
            select(Subscription)
            .where(Subscription.id == subscription.id)
            .options(selectinload(Subscription.plan))
        )
        return result.scalar_one()

    async def activate_after_payment(self, user_id: UUID, plan_id: UUID) -> Subscription:
        """Activate subscription after Mercado Pago payment webhook."""
        plan = await self._load_plan(plan_id)
        existing = await self.db.execute(
            select(Subscription).where(
                Subscription.user_id == user_id,
                Subscription.plan_id == plan_id,
                Subscription.status == SubscriptionStatus.active,
            )
        )
        if existing.scalar_one_or_none():
            raise BusinessError("ALREADY_SUBSCRIBED", "Assinatura já ativa")
        return await self._activate_subscription(user_id, plan)

    async def record_usage_for_completed_appointment(self, appointment) -> None:
        """Increment subscription usage when an appointment paid via subscription is completed."""
        from app.models.appointment import Appointment
        from app.models.subscription import SubscriptionPlanItem

        if not isinstance(appointment, Appointment) or not appointment.subscription_id:
            return

        sub = await self.db.get(Subscription, appointment.subscription_id)
        if not sub or sub.status != SubscriptionStatus.active:
            return

        month_start = self._month_start(datetime.now(UTC)).date()
        usage_result = await self.db.execute(
            select(SubscriptionUsage)
            .join(
                SubscriptionPlanItem,
                SubscriptionPlanItem.id == SubscriptionUsage.plan_item_id,
            )
            .where(
                SubscriptionUsage.subscription_id == sub.id,
                SubscriptionUsage.month_start == month_start,
                SubscriptionPlanItem.service_id == appointment.service_id,
            )
        )
        usage = usage_result.scalar_one_or_none()
        if not usage:
            fallback = await self.db.execute(
                select(SubscriptionUsage).where(
                    SubscriptionUsage.subscription_id == sub.id,
                    SubscriptionUsage.month_start == month_start,
                )
            )
            usage = fallback.scalars().first()
        if not usage:
            return

        usage.uses_this_month += 1
        usage.last_use_date = datetime.now(UTC).date()

    async def cancel(self, user_id: UUID, subscription_id: UUID) -> Subscription:
        subscription = await self.get_user_subscription(user_id, subscription_id)
        if not subscription:
            raise NotFoundError("Assinatura")
        if subscription.status != SubscriptionStatus.active:
            raise BusinessError("INVALID_STATE", "Assinatura já está cancelada ou expirada")

        subscription.status = SubscriptionStatus.cancelled
        subscription.cancelled_at = datetime.now(UTC)
        await self.db.commit()
        await self.db.refresh(subscription)
        return subscription

    async def list_establishment_subscribers(
        self, establishment_id: UUID
    ) -> Sequence[tuple[Subscription, User | None, int, int]]:
        """Return active subscriptions with user and usage summary."""
        month_start = self._month_start(datetime.now(UTC)).date()
        result = await self.db.execute(
            select(Subscription)
            .where(
                Subscription.establishment_id == establishment_id,
                Subscription.status == SubscriptionStatus.active,
            )
            .options(selectinload(Subscription.plan), selectinload(Subscription.user))
            .order_by(Subscription.created_at.desc())
        )
        subs = result.scalars().all()
        rows: list[tuple[Subscription, User | None, int, int]] = []
        for sub in subs:
            usage_result = await self.db.execute(
                select(func.coalesce(func.sum(SubscriptionUsage.uses_this_month), 0)).where(
                    SubscriptionUsage.subscription_id == sub.id,
                    SubscriptionUsage.month_start == month_start,
                )
            )
            uses = int(usage_result.scalar() or 0)
            max_uses = await self._max_uses_for_plan(sub.plan) if sub.plan else 0
            rows.append((sub, sub.user, uses, max_uses))
        return rows
