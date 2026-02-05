"""Payment service."""

from collections.abc import Sequence
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models.appointment import Appointment, AppointmentStatus
from app.models.establishment import Establishment
from app.models.payment import Payment, PaymentPurpose, PaymentStatus
from app.models.user_debt import DebtStatus, UserDebt
from app.services.payment_providers.factory import PaymentProviderFactory


class PaymentService:
    """Payment service."""

    def __init__(self, db: AsyncSession):
        self.db = db

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

        # 3. Create Intent via Provider
        provider = PaymentProviderFactory.get_provider(provider_name)
        intent_data = await provider.create_intent(
            user_id=user_id,
            amount=total_amount,
            metadata={
                "appointment_id": str(appointment_id),
                "user_id": str(user_id),
                "establishment_id": str(appointment.establishment_id),
                "debt_ids": ",".join(str(d.id) for d in pending_debts),
                "is_deposit": "true"
                if appointment.status == AppointmentStatus.awaiting_deposit
                else "false",
                "recovered_fees": str(pending_fees),
            },
        )

        # 4. Create local Payment record (Pending)
        current_platform_fee = total_amount * (settings.STRIPE_PLATFORM_FEE_PERCENT / 100)
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

        return result

    async def pay_with_wallet(self, user_id: UUID, appointment_id: UUID) -> bool:
        """Pay for an appointment using user wallet balance."""
        from app.services.wallet_service import WalletService

        wallet_svc = WalletService(self.db)

        # 1. Get Appointment
        query = select(Appointment).where(Appointment.id == appointment_id)
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

        # 4. Create local Payment record (Succeeded)
        payment = Payment(
            user_id=user_id,
            establishment_id=appointment.establishment_id,
            appointment_id=appointment_id,
            purpose=PaymentPurpose.single,
            amount=total_to_pay,
            platform_fee=0,  # Internal wallet payment, no gateway fee. Maybe platform fee?
            gateway_fee=0,
            net_amount=total_to_pay,
            status=PaymentStatus.succeeded,
        )
        self.db.add(payment)
        await self.db.commit()
        return True

    async def handle_webhook(self, provider_name: str, data: dict[str, Any]) -> None:
        """Handle success webhook from any provider."""
        provider = PaymentProviderFactory.get_provider(provider_name)
        normalized = await provider.handle_webhook(data)

        if normalized and normalized["status"] == "succeeded":
            provider_payment_id = normalized["provider_payment_id"]

            # Find local payment by provider_payment_id (modern) or stripe_id (fallback)
            query = select(Payment).where(
                (Payment.provider_payment_id == provider_payment_id)
                | (Payment.stripe_payment_id == provider_payment_id)
            )
            result = await self.db.execute(query)
            payment = result.scalar_one_or_none()

            if not payment:
                return

            if payment.status == PaymentStatus.succeeded:
                # Already processed (Idempotency)
                return

            payment.status = PaymentStatus.succeeded

            # Confirm appointment or Mark as partially paid?
            # For simplicity, success confirms.
            if payment.appointment_id:
                appt_query = select(Appointment).where(Appointment.id == payment.appointment_id)
                appt_res = await self.db.execute(appt_query)
                appointment = appt_res.scalar_one_or_none()
                if appointment:
                    appointment.status = AppointmentStatus.confirmed

            # Mark debts as paid
            metadata = normalized.get("metadata", {})
            debt_ids_str = metadata.get("debt_ids")
            if debt_ids_str:
                debt_ids = [UUID(d.strip()) for d in debt_ids_str.split(",") if d.strip()]
                for d_id in debt_ids:
                    d_query = select(UserDebt).where(UserDebt.id == d_id)
                    d_res = await self.db.execute(d_query)
                    debt = d_res.scalar_one_or_none()
                    if debt:
                        debt.status = DebtStatus.paid

            # Clear recovered fees from establishment
            recovered_fees = float(metadata.get("recovered_fees", 0))
            if recovered_fees > 0:
                est_query = select(Establishment).where(
                    Establishment.id == payment.establishment_id
                )
                est_res = await self.db.execute(est_query)
                establishment = est_res.scalar_one()
                establishment.pending_platform_fees = (
                    float(establishment.pending_platform_fees or 0) - recovered_fees
                )

            await self.db.commit()
