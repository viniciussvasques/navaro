"""Platform monetization: commissions, tiers, fees, SaaS, promotions."""

from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BusinessError
from app.models.establishment import Establishment, SubscriptionTier
from app.models.payment import Payment, PaymentPurpose, PaymentStatus
from app.models.promotion import Promotion
from app.models.system_settings import SettingsKeys

DEFAULT_SAAS_MONTHLY_PRICE = 29.99
DEFAULT_TRIAL_DAYS = 14
SAAS_BILLING_DAYS = 30

# Default commission % by establishment tier (aligns with docs/BLUEPRINT)
DEFAULT_TIER_COMMISSION: dict[str, float] = {
    SubscriptionTier.free.value: 6.0,
    SubscriptionTier.trial.value: 5.0,
    SubscriptionTier.bronze.value: 5.0,
    SubscriptionTier.silver.value: 4.0,
    SubscriptionTier.gold.value: 3.0,
    SubscriptionTier.platinum.value: 2.0,
}

SETTINGS_KEY_BY_TIER: dict[str, str] = {
    SubscriptionTier.free.value: SettingsKeys.COMMISSION_FREE,
    SubscriptionTier.trial.value: "commission_trial",
    SubscriptionTier.bronze.value: "commission_bronze",
    SubscriptionTier.silver.value: SettingsKeys.COMMISSION_SILVER,
    SubscriptionTier.gold.value: SettingsKeys.COMMISSION_GOLD,
    SubscriptionTier.platinum.value: "commission_platinum",
}


class MonetizationService:
    """Calculate platform revenue from appointments and tiers."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_commission_percent(self, tier: SubscriptionTier | str | None) -> float:
        """Return commission % for establishment tier (configurable via admin settings)."""
        from app.services.settings_service import SettingsService

        tier_value = tier.value if isinstance(tier, SubscriptionTier) else (tier or "free")
        default = DEFAULT_TIER_COMMISSION.get(tier_value, 5.0)
        settings_key = SETTINGS_KEY_BY_TIER.get(tier_value, SettingsKeys.COMMISSION_FREE)

        settings_svc = SettingsService(self.db)
        return await settings_svc.get_float(settings_key, default)

    async def get_saas_monthly_price(self) -> float:
        from app.services.settings_service import SettingsService

        settings_svc = SettingsService(self.db)
        return await settings_svc.get_float(
            SettingsKeys.PLATFORM_SAAS_MONTHLY_PRICE, DEFAULT_SAAS_MONTHLY_PRICE
        )

    async def get_trial_days(self) -> int:
        from app.services.settings_service import SettingsService

        settings_svc = SettingsService(self.db)
        return int(await settings_svc.get_float(SettingsKeys.PLATFORM_TRIAL_DAYS, DEFAULT_TRIAL_DAYS))

    async def calculate_platform_fee(
        self,
        amount: float,
        establishment: Establishment,
    ) -> float:
        """Platform fee for a transaction amount."""
        if amount <= 0:
            return 0.0
        rate = await self.get_commission_percent(establishment.subscription_tier)
        return round(amount * (rate / 100.0), 2)

    async def accrue_pending_fee(
        self,
        establishment: Establishment,
        amount: float,
    ) -> float:
        """Add fee to establishment.pending_platform_fees and return fee amount."""
        fee = await self.calculate_platform_fee(amount, establishment)
        if fee > 0:
            establishment.pending_platform_fees = float(establishment.pending_platform_fees or 0) + fee
        return fee

    def is_platform_subscription_active(self, establishment: Establishment) -> bool:
        expires = establishment.platform_subscription_expires_at
        if expires is None:
            return establishment.subscription_tier in (
                SubscriptionTier.trial,
                SubscriptionTier.bronze,
                SubscriptionTier.silver,
                SubscriptionTier.gold,
                SubscriptionTier.platinum,
                SubscriptionTier.active,
            )
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=UTC)
        return expires > datetime.now(UTC)

    async def get_tier_summary(self, establishment_id: UUID) -> dict:
        """Summary for owner dashboard."""
        result = await self.db.execute(
            select(Establishment).where(Establishment.id == establishment_id)
        )
        est = result.scalar_one_or_none()
        if not est:
            return {}
        rate = await self.get_commission_percent(est.subscription_tier)
        saas_price = await self.get_saas_monthly_price()
        expires = est.platform_subscription_expires_at
        return {
            "subscription_tier": est.subscription_tier.value,
            "commission_percent": rate,
            "pending_platform_fees": float(est.pending_platform_fees or 0),
            "is_sponsored": est.is_sponsored,
            "platform_subscription_expires_at": expires,
            "platform_saas_monthly_price": saas_price,
            "is_platform_subscription_active": self.is_platform_subscription_active(est),
            "platform_auto_renew": bool(est.platform_auto_renew),
        }

    def extend_platform_subscription(self, est: Establishment) -> None:
        """Extend SaaS period by 30 days and upgrade tier if needed."""
        now = datetime.now(UTC)
        base = est.platform_subscription_expires_at or now
        if base.tzinfo is None:
            base = base.replace(tzinfo=UTC)
        if base < now:
            base = now
        est.platform_subscription_expires_at = base + timedelta(days=SAAS_BILLING_DAYS)
        if est.subscription_tier in (
            SubscriptionTier.free,
            SubscriptionTier.trial,
            SubscriptionTier.cancelled,
        ):
            est.subscription_tier = SubscriptionTier.bronze

    async def pay_platform_subscription(
        self,
        establishment_id: UUID,
        owner_user_id: UUID,
    ) -> dict:
        """Charge owner wallet for one month of platform SaaS."""
        from app.services.wallet_service import WalletService

        result = await self.db.execute(
            select(Establishment).where(Establishment.id == establishment_id)
        )
        est = result.scalar_one_or_none()
        if not est:
            raise BusinessError("NOT_FOUND", "Estabelecimento não encontrado")
        if est.owner_id != owner_user_id:
            raise BusinessError("FORBIDDEN", "Apenas o dono pode pagar a assinatura")

        price = await self.get_saas_monthly_price()
        wallet_svc = WalletService(self.db)
        await wallet_svc.withdraw_balance(
            user_id=owner_user_id,
            amount=price,
            description=f"Assinatura DUNNAA Pro — {est.name}",
            reference_id=str(establishment_id),
        )

        self.extend_platform_subscription(est)

        payment = Payment(
            user_id=owner_user_id,
            establishment_id=establishment_id,
            purpose=PaymentPurpose.platform_saas,
            amount=price,
            platform_fee=price,
            gateway_fee=0,
            net_amount=0,
            status=PaymentStatus.succeeded,
        )
        self.db.add(payment)
        await self.db.commit()
        await self.db.refresh(est)

        return {
            "amount_paid": price,
            "platform_subscription_expires_at": est.platform_subscription_expires_at,
            "subscription_tier": est.subscription_tier.value,
        }

    async def activate_platform_subscription_from_payment(self, payment: Payment) -> None:
        """Apply SaaS extension after card/PIX payment succeeds."""
        result = await self.db.execute(
            select(Establishment).where(Establishment.id == payment.establishment_id)
        )
        est = result.scalar_one_or_none()
        if not est:
            return
        self.extend_platform_subscription(est)

    async def set_auto_renew(self, establishment_id: UUID, owner_user_id: UUID, enabled: bool) -> dict:
        result = await self.db.execute(
            select(Establishment).where(Establishment.id == establishment_id)
        )
        est = result.scalar_one_or_none()
        if not est:
            raise BusinessError("NOT_FOUND", "Estabelecimento não encontrado")
        if est.owner_id != owner_user_id:
            raise BusinessError("FORBIDDEN", "Apenas o dono pode alterar renovação automática")
        est.platform_auto_renew = enabled
        await self.db.commit()
        return {"platform_auto_renew": enabled}

    async def process_auto_renewals(self) -> int:
        """Charge owner wallet for establishments expiring within 3 days."""
        now = datetime.now(UTC)
        window = now + timedelta(days=3)
        result = await self.db.execute(
            select(Establishment).where(
                Establishment.platform_auto_renew == True,
                Establishment.platform_subscription_expires_at.isnot(None),
                Establishment.platform_subscription_expires_at <= window,
                Establishment.platform_subscription_expires_at > now,
                Establishment.subscription_tier.notin_(
                    [SubscriptionTier.free, SubscriptionTier.cancelled]
                ),
            )
        )
        establishments = result.scalars().all()
        renewed = 0
        for est in establishments:
            try:
                await self.pay_platform_subscription(est.id, est.owner_id)
                renewed += 1
            except (ValueError, BusinessError):
                continue
        return renewed

    async def resolve_promotion(
        self,
        establishment_id: UUID,
        promotion_id: UUID | None,
        subtotal: float,
    ) -> tuple[float, float, Promotion | None]:
        """Apply promotion discount. Returns (final_amount, discount_amount, promotion)."""
        if subtotal <= 0 or not promotion_id:
            return subtotal, 0.0, None

        now = datetime.now(UTC)
        result = await self.db.execute(
            select(Promotion).where(
                Promotion.id == promotion_id,
                Promotion.establishment_id == establishment_id,
                Promotion.active == True,
                Promotion.starts_at <= now,
                Promotion.ends_at >= now,
            )
        )
        promo = result.scalar_one_or_none()
        if not promo:
            raise BusinessError("INVALID_PROMOTION", "Promoção inválida ou expirada")

        discount = 0.0
        if promo.discount_percent:
            discount = max(discount, subtotal * float(promo.discount_percent) / 100.0)
        if promo.discount_fixed:
            discount = max(discount, float(promo.discount_fixed))
        discount = round(min(discount, subtotal), 2)
        final = round(subtotal - discount, 2)
        return final, discount, promo

    @staticmethod
    def calculate_promotion_discount(subtotal: float, promo: Promotion) -> float:
        """Pure discount calculation for a promotion."""
        discount = 0.0
        if promo.discount_percent:
            discount = max(discount, subtotal * float(promo.discount_percent) / 100.0)
        if promo.discount_fixed:
            discount = max(discount, float(promo.discount_fixed))
        return round(min(discount, subtotal), 2)

    async def expire_platform_subscriptions(self) -> int:
        """Downgrade establishments with expired platform subscription."""
        now = datetime.now(UTC)
        result = await self.db.execute(
            select(Establishment).where(
                Establishment.platform_subscription_expires_at.isnot(None),
                Establishment.platform_subscription_expires_at < now,
                Establishment.subscription_tier.notin_(
                    [SubscriptionTier.free, SubscriptionTier.cancelled]
                ),
            )
        )
        establishments = result.scalars().all()
        count = 0
        for est in establishments:
            est.subscription_tier = SubscriptionTier.free
            count += 1
        if count:
            await self.db.commit()
        return count
