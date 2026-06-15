"""Payment service."""

from collections.abc import Sequence
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.appointment import Appointment, AppointmentStatus
from app.models.establishment import Establishment
from app.models.payment import Payment, PaymentPurpose, PaymentStatus
from app.models.user_debt import DebtStatus, UserDebt
from app.services.payment_providers.factory import PaymentProviderFactory


class PaymentService:
    """Payment service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _load_payment_settings(self) -> tuple[Any, str, str, str]:
        """Return (settings_svc, stripe_key, mp_token, base_url)."""
        from app.models.system_settings import SettingsKeys
        from app.services.settings_service import SettingsService

        settings_svc = SettingsService(self.db)
        stripe_secret_key = await settings_svc.get(SettingsKeys.STRIPE_SECRET_KEY) or getattr(
            settings, "STRIPE_SECRET_KEY", ""
        )
        mercadopago_access_token = (
            await settings_svc.get(SettingsKeys.MERCADOPAGO_ACCESS_TOKEN) or ""
        )
        base_url = await settings_svc.get("app_base_url") or "https://api.dunnaa.com.br"
        return settings_svc, stripe_secret_key, mercadopago_access_token, base_url

    async def _assert_mercadopago_enabled(self, settings_svc: Any) -> str:
        from app.models.system_settings import SettingsKeys

        token = await settings_svc.get(SettingsKeys.MERCADOPAGO_ACCESS_TOKEN) or ""
        if not token:
            raise ValueError(
                "Mercado Pago não configurado. Configure em Admin → Configurações → Pagamentos."
            )
        enabled = (await settings_svc.get(SettingsKeys.MERCADOPAGO_ENABLED) or "false").lower()
        if enabled not in ("true", "1", "yes"):
            raise ValueError("Mercado Pago está desabilitado no admin.")
        return token

    async def get_payment_config(self) -> dict[str, Any]:
        """Payment options available for client apps."""
        from app.models.system_settings import SettingsKeys

        settings_svc, stripe_key, mp_token, _ = await self._load_payment_settings()
        mp_enabled_raw = await settings_svc.get(SettingsKeys.MERCADOPAGO_ENABLED) or "false"
        mp_enabled = mp_enabled_raw.lower() in ("true", "1", "yes") and bool(mp_token)
        stripe_enabled_raw = await settings_svc.get(SettingsKeys.STRIPE_ENABLED) or "false"
        stripe_enabled = stripe_enabled_raw.lower() in ("true", "1", "yes") and bool(stripe_key)
        public_key = await settings_svc.get(SettingsKeys.MERCADOPAGO_PUBLIC_KEY) or None
        return {
            "mercadopago_enabled": mp_enabled,
            "mercadopago_public_key": public_key,
            "stripe_enabled": stripe_enabled,
        }

    def _provider(
        self,
        provider_name: str,
        stripe_secret_key: str,
        mercadopago_access_token: str,
    ):
        return PaymentProviderFactory.get_provider(
            provider_name,
            stripe_secret_key=stripe_secret_key or None,
            mercadopago_access_token=mercadopago_access_token or None,
        )

    async def list_by_user(self, user_id: UUID) -> Sequence[Payment]:
        """List user payments."""
        query = (
            select(Payment).where(Payment.user_id == user_id).order_by(Payment.created_at.desc())
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def list_by_establishment(self, establishment_id: UUID) -> Sequence[Payment]:
        """List establishment payments."""
        query = (
            select(Payment)
            .where(Payment.establishment_id == establishment_id)
            .order_by(Payment.created_at.desc())
        )
        result = await self.db.execute(query)
        return result.scalars().all()

    async def create_payment_intent(
        self, user_id: UUID, appointment_id: UUID, provider_name: str = "stripe"
    ) -> dict[str, Any]:
        """
        Create payment intent for an appointment via a specific provider (Stripe, MercadoPago).
        """
        # 1. Get Appointment
        from app.services.monetization_service import MonetizationService

        query = (
            select(Appointment)
            .where(Appointment.id == appointment_id)
            .options(selectinload(Appointment.establishment), selectinload(Appointment.service))
        )
        result = await self.db.execute(query)
        appointment = result.scalar_one_or_none()

        if not appointment:
            raise ValueError("Agendamento não encontrado")

        if appointment.user_id != user_id:
            raise ValueError("Não autorizado")

        # Determine Amount
        base_amount = float(appointment.total_price or 0)

        # Check if it's a deposit payment
        if appointment.status == AppointmentStatus.awaiting_deposit:
            # Calculate deposit amount
            est = appointment.establishment
            svc = appointment.service

            # Service specific deposit or establishment default
            deposit_percent = est.deposit_percent or 0.0
            # If service requires deposit but no percent defined, default to 20% or something
            if svc and svc.deposit_required and deposit_percent == 0:
                deposit_percent = 20.0

            amount_to_pay = base_amount * (float(deposit_percent) / 100)
            if amount_to_pay <= 0:
                amount_to_pay = base_amount  # Fallback to total if percent is 0
        else:
            amount_to_pay = base_amount

        # 2. Check for Pending Debts at this Establishment
        debt_query = select(UserDebt).where(
            UserDebt.user_id == user_id,
            UserDebt.establishment_id == appointment.establishment_id,
            UserDebt.status == DebtStatus.pending,
        )
        debt_result = await self.db.execute(debt_query)
        pending_debts = debt_result.scalars().all()

        debt_amount = sum(float(d.amount) for d in pending_debts)
        pending_fees = debt_amount
        total_amount = amount_to_pay + debt_amount

        if total_amount <= 0:
            raise ValueError("Valor inválido para pagamento")

        # Load payment provider credentials from dynamic config (admin)
        settings_svc, stripe_secret_key, mercadopago_access_token, base_url = (
            await self._load_payment_settings()
        )

        if provider_name.lower() == "mercadopago":
            mercadopago_access_token = await self._assert_mercadopago_enabled(settings_svc)

        # 3. Create Intent via Provider
        provider = self._provider(provider_name, stripe_secret_key, mercadopago_access_token)

        mon_svc = MonetizationService(self.db)
        commission_rate = await mon_svc.get_commission_percent(
            appointment.establishment.subscription_tier
        )
        application_fee = await mon_svc.calculate_platform_fee(
            total_amount, appointment.establishment
        )
        total_platform = application_fee + pending_fees

        # Resolve payer email
        from app.models.user import User

        payer_query = select(User).where(User.id == user_id)
        payer_result = await self.db.execute(payer_query)
        payer = payer_result.scalar_one_or_none()
        payer_email = payer.email if payer and payer.email else "cliente@dunnaa.com.br"

        from app.services.mercadopago_oauth_service import MercadoPagoOAuthService

        oauth_svc = MercadoPagoOAuthService(self.db)
        mp_split = await oauth_svc.build_marketplace_fields(
            appointment.establishment, total_platform
        )

        # Build webhook URL from settings
        webhook_url = f"{base_url}/api/v1/payments/webhooks/mercadopago"

        intent_data = await provider.create_intent(
            user_id=user_id,
            amount=total_amount,
            metadata={
                "purpose": "appointment",
                "appointment_id": str(appointment_id),
                "user_id": str(user_id),
                "establishment_id": str(appointment.establishment_id),
                "establishment_name": appointment.establishment.name or "Servico",
                "debt_ids": ",".join(str(d.id) for d in pending_debts),
                "is_deposit": "true"
                if appointment.status == AppointmentStatus.awaiting_deposit
                else "false",
                "recovered_fees": str(pending_fees),
                "payer_email": payer_email,
                "webhook_url": webhook_url,
                **mp_split,
            },
        )

        # 4. Create local Payment record (Pending)
        current_platform_fee = total_amount * (commission_rate / 100)
        total_platform_fee = current_platform_fee + pending_fees

        payment = Payment(
            user_id=user_id,
            establishment_id=appointment.establishment_id,
            appointment_id=appointment_id,
            purpose=PaymentPurpose.single,
            amount=total_amount,
            platform_fee=total_platform_fee,
            gateway_fee=total_amount * 0.03,
            net_amount=total_amount - total_platform_fee - (total_amount * 0.03),
            status=PaymentStatus.pending,
            provider=provider_name,
            provider_payment_id=intent_data["provider_payment_id"],
            stripe_payment_id=intent_data["provider_payment_id"]
            if provider_name == "stripe"
            else None,
        )
        self.db.add(payment)
        await self.db.commit()

        result = {
            "amount": total_amount,
            "provider": provider_name,
            "provider_payment_id": intent_data["provider_payment_id"],
        }
        if "client_secret" in intent_data:
            result["client_secret"] = intent_data["client_secret"]
        if "qr_code" in intent_data:
            result["qr_code"] = intent_data["qr_code"]
            result["qr_code_base64"] = intent_data.get("qr_code_base64")
        if "ticket_url" in intent_data:
            result["ticket_url"] = intent_data["ticket_url"]

        return result

    async def create_checkout(
        self,
        user_id: UUID,
        appointment_id: UUID,
    ) -> dict[str, Any]:
        """Create Mercado Pago Checkout Pro and persist a pending Payment record."""
        from app.models.user import User
        from app.services.mercadopago_oauth_service import MercadoPagoOAuthService
        from app.services.monetization_service import MonetizationService
        from app.services.payment_providers.mercadopago_p import MercadoPagoProvider

        query = (
            select(Appointment)
            .where(Appointment.id == appointment_id)
            .options(selectinload(Appointment.establishment), selectinload(Appointment.service))
        )
        result = await self.db.execute(query)
        appointment = result.scalar_one_or_none()

        if not appointment:
            raise ValueError("Agendamento não encontrado")
        if appointment.user_id != user_id:
            raise ValueError("Não autorizado")

        amount = float(appointment.total_price or 0)
        if amount <= 0:
            raise ValueError("Valor inválido para pagamento")

        settings_svc, _, mercadopago_access_token, base_url = await self._load_payment_settings()
        mercadopago_access_token = await self._assert_mercadopago_enabled(settings_svc)

        mon_svc = MonetizationService(self.db)
        est = appointment.establishment
        application_fee = await mon_svc.calculate_platform_fee(amount, est) if est else 0.0
        commission_rate = await mon_svc.get_commission_percent(est.subscription_tier) if est else 0.0

        oauth_svc = MercadoPagoOAuthService(self.db)
        mp_split = await oauth_svc.build_marketplace_fields(est, application_fee) if est else {}

        payer_result = await self.db.execute(select(User).where(User.id == user_id))
        payer = payer_result.scalar_one_or_none()
        payer_email = payer.email if payer and payer.email else "cliente@dunnaa.com.br"

        webhook_url = f"{base_url}/api/v1/payments/webhooks/mercadopago"
        metadata = {
            "purpose": "appointment",
            "appointment_id": str(appointment_id),
            "establishment_id": str(appointment.establishment_id),
            "establishment_name": est.name if est else "",
            "payer_email": payer_email,
            "webhook_url": webhook_url,
            **mp_split,
        }

        mp = MercadoPagoProvider(access_token=mercadopago_access_token)
        try:
            checkout_data = await mp.create_checkout_preference(
                user_id=user_id,
                amount=amount,
                metadata=metadata,
            )
        except ValueError as exc:
            if est and est.mercadopago_refresh_token and "401" in str(exc):
                await oauth_svc.refresh_seller_token(est)
                mp_split = await oauth_svc.build_marketplace_fields(est, application_fee)
                metadata.update(mp_split)
                checkout_data = await mp.create_checkout_preference(
                    user_id=user_id,
                    amount=amount,
                    metadata=metadata,
                )
            else:
                raise

        preference_id = checkout_data["provider_payment_id"]
        platform_fee = amount * (commission_rate / 100)
        gateway_fee = round(amount * 0.03, 2)

        payment = Payment(
            user_id=user_id,
            establishment_id=appointment.establishment_id,
            appointment_id=appointment_id,
            purpose=PaymentPurpose.single,
            amount=amount,
            platform_fee=platform_fee,
            gateway_fee=gateway_fee,
            net_amount=amount - platform_fee - gateway_fee,
            status=PaymentStatus.pending,
            provider="mercadopago",
            provider_payment_id=preference_id,
        )
        self.db.add(payment)
        await self.db.commit()

        return {
            "checkout_url": checkout_data.get("checkout_url", ""),
            "sandbox_url": checkout_data.get("sandbox_url", ""),
            "preference_id": preference_id,
            "amount": amount,
        }

    async def create_saas_payment_intent(
        self,
        user_id: UUID,
        establishment_id: UUID,
        provider_name: str = "mercadopago",
    ) -> dict[str, Any]:
        """Create payment intent for platform SaaS subscription (100% to platform)."""
        from app.models.user import User
        from app.services.monetization_service import MonetizationService

        est_result = await self.db.execute(
            select(Establishment).where(Establishment.id == establishment_id)
        )
        establishment = est_result.scalar_one_or_none()
        if not establishment:
            raise ValueError("Estabelecimento não encontrado")
        if establishment.owner_id != user_id:
            raise ValueError("Não autorizado")

        mon_svc = MonetizationService(self.db)
        total_amount = await mon_svc.get_saas_monthly_price()
        if total_amount <= 0:
            raise ValueError("Valor inválido para assinatura")

        settings_svc, stripe_secret_key, mercadopago_access_token, base_url = (
            await self._load_payment_settings()
        )
        if provider_name.lower() == "mercadopago":
            mercadopago_access_token = await self._assert_mercadopago_enabled(settings_svc)

        provider = self._provider(provider_name, stripe_secret_key, mercadopago_access_token)

        payer_result = await self.db.execute(select(User).where(User.id == user_id))
        payer = payer_result.scalar_one_or_none()
        payer_email = payer.email if payer and payer.email else "dono@dunnaa.com.br"

        webhook_url = f"{base_url}/api/v1/payments/webhooks/mercadopago"

        intent_data = await provider.create_intent(
            user_id=user_id,
            amount=total_amount,
            metadata={
                "purpose": "platform_saas",
                "user_id": str(user_id),
                "establishment_id": str(establishment_id),
                "establishment_name": establishment.name or "Estabelecimento",
                "payer_email": payer_email,
                "webhook_url": webhook_url,
                "application_fee": str(total_amount),
                "seller_id": "",
            },
        )

        gateway_fee = round(total_amount * 0.03, 2)
        payment = Payment(
            user_id=user_id,
            establishment_id=establishment_id,
            purpose=PaymentPurpose.platform_saas,
            amount=total_amount,
            platform_fee=total_amount,
            gateway_fee=gateway_fee,
            net_amount=0,
            status=PaymentStatus.pending,
            provider=provider_name,
            provider_payment_id=intent_data["provider_payment_id"],
            stripe_payment_id=intent_data["provider_payment_id"]
            if provider_name == "stripe"
            else None,
        )
        self.db.add(payment)
        await self.db.commit()

        result = {
            "amount": total_amount,
            "provider": provider_name,
            "provider_payment_id": intent_data["provider_payment_id"],
        }
        if "client_secret" in intent_data:
            result["client_secret"] = intent_data["client_secret"]
        if "qr_code" in intent_data:
            result["qr_code"] = intent_data["qr_code"]
            result["qr_code_base64"] = intent_data.get("qr_code_base64")
        if "ticket_url" in intent_data:
            result["ticket_url"] = intent_data["ticket_url"]
        return result

    async def create_subscription_payment_intent(
        self,
        user_id: UUID,
        plan_id: UUID,
        provider_name: str = "mercadopago",
    ) -> dict[str, Any]:
        """Create Mercado Pago PIX intent for a customer subscription plan."""
        from app.models.subscription import SubscriptionPlan, SubscriptionStatus, Subscription
        from app.models.user import User
        from app.services.monetization_service import MonetizationService

        plan_result = await self.db.execute(
            select(SubscriptionPlan)
            .where(SubscriptionPlan.id == plan_id, SubscriptionPlan.active == True)
            .options(selectinload(SubscriptionPlan.establishment))
        )
        plan = plan_result.scalar_one_or_none()
        if not plan:
            raise ValueError("Plano de assinatura não encontrado")

        existing = await self.db.execute(
            select(Subscription).where(
                Subscription.user_id == user_id,
                Subscription.plan_id == plan_id,
                Subscription.status == SubscriptionStatus.active,
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError("Você já possui assinatura ativa deste plano")

        total_amount = float(plan.price)
        if total_amount <= 0:
            raise ValueError("Valor inválido para assinatura")

        settings_svc, stripe_secret_key, mercadopago_access_token, base_url = (
            await self._load_payment_settings()
        )
        if provider_name.lower() == "mercadopago":
            mercadopago_access_token = await self._assert_mercadopago_enabled(settings_svc)

        provider = self._provider(provider_name, stripe_secret_key, mercadopago_access_token)

        payer_result = await self.db.execute(select(User).where(User.id == user_id))
        payer = payer_result.scalar_one_or_none()
        payer_email = payer.email if payer and payer.email else "cliente@dunnaa.com.br"

        mon_svc = MonetizationService(self.db)
        est = plan.establishment
        application_fee = await mon_svc.calculate_platform_fee(total_amount, est) if est else 0.0

        from app.services.mercadopago_oauth_service import MercadoPagoOAuthService

        mp_split = (
            MercadoPagoOAuthService.marketplace_payment_fields(est, application_fee)
            if est
            else {}
        )

        webhook_url = f"{base_url}/api/v1/payments/webhooks/mercadopago"

        intent_data = await provider.create_intent(
            user_id=user_id,
            amount=total_amount,
            metadata={
                "purpose": "subscription",
                "plan_id": str(plan_id),
                "user_id": str(user_id),
                "establishment_id": str(plan.establishment_id),
                "establishment_name": est.name if est else plan.name,
                "payer_email": payer_email,
                "webhook_url": webhook_url,
                **mp_split,
            },
        )

        gateway_fee = round(total_amount * 0.03, 2)
        payment = Payment(
            user_id=user_id,
            establishment_id=plan.establishment_id,
            purpose=PaymentPurpose.subscription,
            amount=total_amount,
            platform_fee=application_fee,
            gateway_fee=gateway_fee,
            net_amount=total_amount - application_fee - gateway_fee,
            status=PaymentStatus.pending,
            provider=provider_name,
            provider_payment_id=intent_data["provider_payment_id"],
        )
        self.db.add(payment)
        await self.db.commit()

        result = {
            "amount": total_amount,
            "provider": provider_name,
            "provider_payment_id": intent_data["provider_payment_id"],
            "plan_id": str(plan_id),
            "plan_name": plan.name,
        }
        if "qr_code" in intent_data:
            result["qr_code"] = intent_data["qr_code"]
            result["qr_code_base64"] = intent_data.get("qr_code_base64")
        if "ticket_url" in intent_data:
            result["ticket_url"] = intent_data["ticket_url"]
        return result

    async def pay_with_wallet(self, user_id: UUID, appointment_id: UUID) -> bool:
        """Pay for an appointment using user wallet balance."""
        from app.services.wallet_service import WalletService

        wallet_svc = WalletService(self.db)

        from app.services.monetization_service import MonetizationService

        # 1. Get Appointment
        query = (
            select(Appointment)
            .where(Appointment.id == appointment_id)
            .options(selectinload(Appointment.establishment))
        )
        result = await self.db.execute(query)
        appointment = result.scalar_one_or_none()

        if not appointment or appointment.user_id != user_id:
            raise ValueError("Agendamento não encontrado")

        if appointment.status not in [
            AppointmentStatus.pending,
            AppointmentStatus.awaiting_deposit,
        ]:
            raise ValueError("Agendamento já pago ou cancelado")

        # Calculate Total including debts (Wallet pays full or nothing for simplicity now)
        base_amount = float(appointment.total_price or 0)

        debt_query = select(UserDebt).where(
            UserDebt.user_id == user_id,
            UserDebt.establishment_id == appointment.establishment_id,
            UserDebt.status == DebtStatus.pending,
        )
        debt_result = await self.db.execute(debt_query)
        pending_debts = debt_result.scalars().all()
        debt_amount = sum(float(d.amount) for d in pending_debts)

        total_to_pay = base_amount + debt_amount

        # 2. Withdraw from Wallet
        try:
            await wallet_svc.withdraw_balance(
                user_id=user_id,
                amount=total_to_pay,
                description=f"Pagamento agendamento {appointment_id}",
                reference_id=str(appointment_id),
            )
        except ValueError as e:
            raise e  # Insufficient funds

        # 3. Mark as paid
        appointment.status = AppointmentStatus.confirmed
        for debt in pending_debts:
            debt.status = DebtStatus.paid

        mon_svc = MonetizationService(self.db)
        platform_fee = await mon_svc.accrue_pending_fee(
            appointment.establishment, total_to_pay
        )

        # 4. Create local Payment record (Succeeded)
        payment = Payment(
            user_id=user_id,
            establishment_id=appointment.establishment_id,
            appointment_id=appointment_id,
            purpose=PaymentPurpose.single,
            amount=total_to_pay,
            platform_fee=platform_fee,
            gateway_fee=0,
            net_amount=total_to_pay - platform_fee,
            status=PaymentStatus.succeeded,
        )
        self.db.add(payment)
        await self.db.commit()
        return True

    async def handle_webhook(self, provider_name: str, data: dict[str, Any]) -> None:
        """Handle success webhook from any provider."""
        settings_svc, stripe_secret_key, mercadopago_access_token, _ = (
            await self._load_payment_settings()
        )
        provider = self._provider(provider_name, stripe_secret_key, mercadopago_access_token)
        normalized = await provider.handle_webhook(data)

        if not normalized or normalized["status"] != "succeeded":
            return

        provider_payment_id = normalized["provider_payment_id"]
        metadata = normalized.get("metadata", {}) or {}

        # Tips paid via Mercado Pago (stored on tips table)
        from app.models.payment import Tip
        from app.models.staff import StaffMember
        from app.models.wallet import TransactionType
        from app.services.wallet_service import WalletService

        tip_result = await self.db.execute(
            select(Tip).where(Tip.provider_payment_id == provider_payment_id)
        )
        tip = tip_result.scalar_one_or_none()
        if tip:
            if tip.status == PaymentStatus.succeeded:
                return
            tip.status = PaymentStatus.succeeded
            staff_result = await self.db.execute(
                select(StaffMember).where(StaffMember.id == tip.staff_id)
            )
            staff = staff_result.scalar_one_or_none()
            if staff and staff.user_id:
                wallet = WalletService(self.db)
                await wallet.add_balance(
                    user_id=staff.user_id,
                    amount=float(tip.amount),
                    description="Gorjeta recebida via Mercado Pago",
                    reference_id=str(tip.user_id),
                    tx_type=TransactionType.deposit,
                )
            await self.db.commit()
            return

        query = select(Payment).where(
            (Payment.provider_payment_id == provider_payment_id)
            | (Payment.stripe_payment_id == provider_payment_id)
        )
        result = await self.db.execute(query)
        payment = result.scalar_one_or_none()

        if not payment:
            appointment_id_str = metadata.get("appointment_id") or metadata.get("external_reference")
            if appointment_id_str:
                try:
                    appt_uuid = UUID(str(appointment_id_str))
                except ValueError:
                    appt_uuid = None
                if appt_uuid:
                    pending_result = await self.db.execute(
                        select(Payment).where(
                            Payment.appointment_id == appt_uuid,
                            Payment.status == PaymentStatus.pending,
                        )
                    )
                    payment = pending_result.scalar_one_or_none()

        if not payment:
            return

        if payment.provider_payment_id != provider_payment_id:
            payment.provider_payment_id = provider_payment_id

        if payment.status == PaymentStatus.succeeded:
            return

        payment.status = PaymentStatus.succeeded

        if payment.purpose == PaymentPurpose.platform_saas:
            from app.services.monetization_service import MonetizationService

            mon_svc = MonetizationService(self.db)
            await mon_svc.activate_platform_subscription_from_payment(payment)
            await self.db.commit()
            return

        if payment.purpose == PaymentPurpose.subscription:
            from app.services.subscription_service import SubscriptionService

            plan_id_str = metadata.get("plan_id")
            if plan_id_str:
                sub_svc = SubscriptionService(self.db)
                try:
                    sub = await sub_svc.activate_after_payment(payment.user_id, UUID(plan_id_str))
                    payment.subscription_id = sub.id
                except Exception:
                    pass
            await self.db.commit()
            return

        if payment.appointment_id:
            appt_query = select(Appointment).where(Appointment.id == payment.appointment_id)
            appt_res = await self.db.execute(appt_query)
            appointment = appt_res.scalar_one_or_none()
            if appointment:
                appointment.status = AppointmentStatus.confirmed
        elif metadata.get("appointment_id"):
            appt_id = UUID(metadata["appointment_id"])
            appt_res = await self.db.execute(select(Appointment).where(Appointment.id == appt_id))
            appointment = appt_res.scalar_one_or_none()
            if appointment:
                appointment.status = AppointmentStatus.confirmed
                payment.appointment_id = appt_id

        debt_ids_str = metadata.get("debt_ids")
        if debt_ids_str:
            debt_ids = [UUID(d.strip()) for d in debt_ids_str.split(",") if d.strip()]
            for d_id in debt_ids:
                d_query = select(UserDebt).where(UserDebt.id == d_id)
                d_res = await self.db.execute(d_query)
                debt = d_res.scalar_one_or_none()
                if debt:
                    debt.status = DebtStatus.paid

        recovered_fees = float(metadata.get("recovered_fees", 0) or 0)
        if recovered_fees > 0:
            est_query = select(Establishment).where(Establishment.id == payment.establishment_id)
            est_res = await self.db.execute(est_query)
            establishment = est_res.scalar_one()
            establishment.pending_platform_fees = (
                float(establishment.pending_platform_fees or 0) - recovered_fees
            )

        await self.db.commit()

        if payment.purpose == PaymentPurpose.single:
            try:
                est_res = await self.db.execute(
                    select(Establishment).where(Establishment.id == payment.establishment_id)
                )
                est = est_res.scalar_one_or_none()
                # Skip manual auto-payout when MP marketplace split already routes funds
                if est and est.mercadopago_user_id:
                    return

                from app.services.auto_payout_service import AutoPayoutService

                auto_payout = AutoPayoutService(self.db)
                await auto_payout.process_auto_payout(payment.id)
            except Exception as e:
                from app.core.logging import get_logger

                logger = get_logger(__name__)
                logger.error(
                    "Auto-payout failed (non-critical)",
                    payment_id=str(payment.id),
                    error=str(e),
                )
