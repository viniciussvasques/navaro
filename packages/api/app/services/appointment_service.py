"""Appointment service."""

import time
from collections.abc import Sequence
from datetime import UTC, date, datetime, timedelta
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.appointment import Appointment, AppointmentProduct, AppointmentStatus
from app.models.establishment import Establishment
from app.models.product import Product
from app.models.service import Service
from app.models.staff import StaffMember
from app.models.staff_block import StaffBlock
from app.models.user_debt import DebtStatus, UserDebt
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate


class AppointmentService:
    """Appointment service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_by_user(
        self,
        user_id: UUID,
        status: str | None = None,
    ) -> Sequence[Appointment]:
        """List user appointments."""
        query = (
            select(Appointment)
            .where(Appointment.user_id == user_id)
            .options(selectinload(Appointment.products).selectinload(AppointmentProduct.product))
        )

        if status:
            query = query.where(Appointment.status == status)

        query = query.order_by(Appointment.scheduled_at.desc())

        result = await self.db.execute(query)
        return result.scalars().all()

    async def list_by_establishment(
        self,
        establishment_id: UUID,
        date_filter: date | None = None,
        staff_id: UUID | None = None,
        status_filter: str | None = None,
    ) -> Sequence[Appointment]:
        """List establishment appointments."""
        query = (
            select(Appointment)
            .where(Appointment.establishment_id == establishment_id)
            .options(selectinload(Appointment.products).selectinload(AppointmentProduct.product))
        )

        if date_filter:
            # Filter by day
            # Assuming scheduled_at is aware or stored as UTC
            # We want checking if scheduled_at date matches
            query = query.where(func.date(Appointment.scheduled_at) == date_filter)

        if staff_id:
            query = query.where(Appointment.staff_id == staff_id)

        if status_filter:
            query = query.where(Appointment.status == status_filter)

        query = query.order_by(Appointment.scheduled_at)

        result = await self.db.execute(query)
        return result.scalars().all()

    async def create(self, user_id: UUID, data: AppointmentCreate) -> Appointment:
        """Create appointment."""
        from app.core.metrics import metrics

        start_time = time.time()
        try:
            # Validate Service
            service_result = await self.db.execute(
                select(Service).where(Service.id == data.service_id)
            )
            service = service_result.scalar_one_or_none()
            if not service:
                raise ValueError("Serviço não encontrado")

            # Validate Staff
            staff_result = await self.db.execute(
                select(StaffMember).where(StaffMember.id == data.staff_id)
            )
            staff = staff_result.scalar_one_or_none()
            if not staff:
                raise ValueError("Profissional não encontrado")

            # ─── Schedule Validation ───────────────────────────────────────────────
            appt_start = data.scheduled_at
            if appt_start.tzinfo is None:
                appt_start = appt_start.replace(tzinfo=UTC)

            appt_end = appt_start + timedelta(minutes=service.duration_minutes)

            # Robust day detection (0=Mon, 6=Sun)
            weekdays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
            day_key = weekdays[appt_start.weekday()]

            # 1. Establishment Business Hours
            est_result = await self.db.execute(
                select(Establishment).where(Establishment.id == data.establishment_id)
            )
            establishment = est_result.scalar_one()

            est_hours = establishment.business_hours.get(day_key)
            if not est_hours:
                raise ValueError(f"Estabelecimento fechado em {day_key}")

            # 2. Staff Work Schedule
            staff_hours = staff.work_schedule.get(day_key) if staff.work_schedule else None
            if not staff_hours:
                staff_hours = est_hours
            if not staff_hours:
                raise ValueError(f"Profissional não trabalha em {day_key}")

            # Simple time comparison (format "HH:MM")
            curr_time = appt_start.strftime("%H:%M")
            if curr_time < staff_hours["open"] or curr_time > staff_hours["close"]:
                raise ValueError(
                    f"Horário fora da jornada do profissional ({staff_hours['open']}-{staff_hours['close']})"
                )

            # 3. Staff Blocks
            block_result = await self.db.execute(
                select(StaffBlock).where(
                    StaffBlock.staff_id == data.staff_id,
                    StaffBlock.start_at < appt_end,
                    StaffBlock.end_at > appt_start,
                )
            )
            if block_result.scalar_one_or_none():
                raise ValueError("Profissional indisponível (Bloqueio de agenda)")

            # 4. Conflicting Appointments
            conflict_result = await self.db.execute(
                select(Appointment).where(
                    Appointment.staff_id == data.staff_id,
                    Appointment.status != AppointmentStatus.cancelled,
                    Appointment.scheduled_at < appt_end,
                )
            )
            conflicts = conflict_result.scalars().all()
            for c in conflicts:
                c_end = c.scheduled_at + timedelta(minutes=c.duration_minutes)
                if c.scheduled_at < appt_end and c_end > appt_start:
                    raise ValueError("Conflito de horário com outro agendamento")

            # ─── Create Appointment ────────────────────────────────────────────────
            initial_status = AppointmentStatus.pending
            if service.deposit_required or (establishment.deposit_percent > 0):
                initial_status = AppointmentStatus.awaiting_deposit

            appointment = Appointment(
                user_id=user_id,
                establishment_id=data.establishment_id,
                service_id=data.service_id,
                staff_id=data.staff_id,
                scheduled_at=data.scheduled_at,
                duration_minutes=service.duration_minutes,
                payment_type=data.payment_type,
                payment_method=data.payment_method,
                status=initial_status,
                total_price=float(service.price),
            )

            self.db.add(appointment)
            await self.db.flush()

            # Handle Products
            if data.products:
                total_prod_price = 0
                for p_data in data.products:
                    prod_result = await self.db.execute(
                        select(Product).where(Product.id == p_data.product_id)
                    )
                    product = prod_result.scalar_one_or_none()
                    if not product:
                        raise ValueError(f"Produto {p_data.product_id} não encontrado")

                    appt_prod = AppointmentProduct(
                        appointment_id=appointment.id,
                        product_id=product.id,
                        quantity=p_data.quantity,
                        unit_price=product.price,
                    )
                    self.db.add(appt_prod)
                    total_prod_price += float(product.price) * p_data.quantity

                appointment.total_price = float(service.price) + total_prod_price

            await self.db.commit()

            # Reload with products
            result = await self.db.execute(
                select(Appointment)
                .where(Appointment.id == appointment.id)
                .options(
                    selectinload(Appointment.products).selectinload(AppointmentProduct.product)
                )
            )

            # Metric: Success
            metrics.count(
                "appointment_created", tags={"establishment_id": str(data.establishment_id)}
            )
            metrics.measure_time("appointment_create_duration", time.time() - start_time)

            return result.scalar_one()

        except Exception as e:
            # Metric: Failure
            metrics.count(
                "appointment_failed",
                tags={"reason": str(e), "establishment_id": str(data.establishment_id)},
            )
            raise e

    async def update(
        self,
        appointment_id: UUID,
        data: AppointmentUpdate,
    ) -> Appointment | None:
        """Update appointment."""
        from app.core.metrics import metrics

        query = (
            select(Appointment)
            .where(Appointment.id == appointment_id)
            .options(selectinload(Appointment.products).selectinload(AppointmentProduct.product))
        )
        result = await self.db.execute(query)
        appointment = result.scalar_one_or_none()

        if not appointment:
            return None

        if data.status:
            # Metric: Status Change
            if (
                data.status == AppointmentStatus.completed
                and appointment.status != AppointmentStatus.completed
            ):
                metrics.count(
                    "appointment_completed",
                    tags={"establishment_id": str(appointment.establishment_id)},
                )

            # If transitioning to COMPLETED and paid in CASH, accrued 5% platform fee
            from app.models.appointment import PaymentMethod

            if (
                data.status == AppointmentStatus.completed
                and appointment.status != AppointmentStatus.completed
            ):
                if appointment.payment_method == PaymentMethod.cash:
                    # Accrue 5% fee to establishment
                    fee = float(appointment.total_price or 0) * 0.05
                    # Load establishment to update fees
                    est_query = select(Establishment).where(
                        Establishment.id == appointment.establishment_id
                    )
                    est_res = await self.db.execute(est_query)
                    establishment = est_res.scalar_one()
                    establishment.pending_platform_fees = (
                        float(establishment.pending_platform_fees or 0) + fee
                    )

            appointment.status = data.status

        if data.products:
            # Clear existing products
            await self.db.execute(
                select(AppointmentProduct)
                .where(AppointmentProduct.appointment_id == appointment_id)
                .delete()
            )

            # Recalculate total price starting from service price
            # We need to find the service price.
            service_result = await self.db.execute(
                select(Service).where(Service.id == appointment.service_id)
            )
            service = service_result.scalar_one()

            total_prod_price = 0
            for p_data in data.products:
                prod_result = await self.db.execute(
                    select(Product).where(Product.id == p_data.product_id)
                )
                product = prod_result.scalar_one_or_none()
                if not product:
                    raise ValueError(f"Produto {p_data.product_id} não encontrado")

                appt_prod = AppointmentProduct(
                    appointment_id=appointment.id,
                    product_id=product.id,
                    quantity=p_data.quantity,
                    unit_price=product.price,
                )
                self.db.add(appt_prod)
                total_prod_price += float(product.price) * p_data.quantity

            appointment.total_price = float(service.price) + total_prod_price

        await self.db.commit()
        await self.db.refresh(appointment)
        return appointment

    async def cancel(self, appointment_id: UUID, user_id: UUID, reason: str | None = None) -> bool:
        """Cancel appointment with potential late fee."""
        from app.core.metrics import metrics

        query = (
            select(Appointment)
            .where(Appointment.id == appointment_id)
            .options(selectinload(Appointment.establishment))
        )
        result = await self.db.execute(query)
        appointment = result.scalar_one_or_none()

        if not appointment:
            return False

        # 1. Check for late cancellation (less than 30 mins)
        now = datetime.now(appointment.scheduled_at.tzinfo)
        time_diff = appointment.scheduled_at - now

        if time_diff < timedelta(minutes=30) and appointment.status != AppointmentStatus.cancelled:
            # Apply cancellation fee if establishment has one
            fee = appointment.establishment.cancellation_fee_fixed
            if fee > 0:
                debt = UserDebt(
                    user_id=appointment.user_id,
                    establishment_id=appointment.establishment_id,
                    appointment_id=appointment.id,
                    amount=fee,
                    status=DebtStatus.pending,
                )
                self.db.add(debt)
                metrics.count(
                    "late_cancellation_fee",
                    tags={"amount": fee, "establishment_id": str(appointment.establishment_id)},
                )

        appointment.status = AppointmentStatus.cancelled
        if reason:
            appointment.cancel_reason = reason

        await self.db.commit()

        metrics.count(
            "appointment_cancelled", tags={"establishment_id": str(appointment.establishment_id)}
        )
        return True

    async def mark_no_show(self, appointment_id: UUID) -> bool:
        """Mark appointment as no-show and apply fee."""
        from app.core.metrics import metrics

        query = (
            select(Appointment)
            .where(Appointment.id == appointment_id)
            .options(selectinload(Appointment.establishment))
        )
        result = await self.db.execute(query)
        appointment = result.scalar_one_or_none()

        if not appointment or appointment.status == AppointmentStatus.no_show:
            return False

        appointment.status = AppointmentStatus.no_show

        # Apply no-show fee if configured
        fee_percent = appointment.establishment.no_show_fee_percent
        if fee_percent > 0:
            fee_amount = float(appointment.total_price) * (float(fee_percent) / 100)
            if fee_amount > 0:
                debt = UserDebt(
                    user_id=appointment.user_id,
                    establishment_id=appointment.establishment_id,
                    appointment_id=appointment.id,
                    amount=fee_amount,
                    status=DebtStatus.pending,
                )
                self.db.add(debt)
                metrics.count(
                    "noshow_fee",
                    tags={
                        "amount": fee_amount,
                        "establishment_id": str(appointment.establishment_id),
                    },
                )

        await self.db.commit()

        metrics.count(
            "appointment_noshow", tags={"establishment_id": str(appointment.establishment_id)}
        )
        return True

    async def _get(self, appointment_id: UUID) -> Appointment | None:
        return (
            await self.db.execute(select(Appointment).where(Appointment.id == appointment_id))
        ).scalar_one_or_none()
