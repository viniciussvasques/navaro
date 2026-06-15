"""Appointment service."""

import time
from collections.abc import Sequence
from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.appointment import Appointment, AppointmentProduct, AppointmentStatus, PaymentMethod
from app.models.establishment import Establishment
from app.models.product import Product
from app.models.user import User
from app.models.service import Service
from app.models.staff import StaffMember
from app.models.staff_block import StaffBlock
from app.models.system_settings import SettingsKeys
from app.models.user_debt import DebtStatus, UserDebt
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate
from app.schemas.establishment import TimeSlot
from app.services.settings_service import SettingsService
from app.services.wallet_service import WalletService


class AppointmentService:
    """Appointment service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_by_user(
        self,
        user_id: UUID,
        status: str | None = None,
        date_filter: date | None = None,
        establishment_id: UUID | None = None,
    ) -> Sequence[Appointment]:
        """List user appointments."""
        query = (
            select(Appointment)
            .where(Appointment.user_id == user_id)
            .options(selectinload(Appointment.products).selectinload(AppointmentProduct.product))
        )

        if status:
            if "," in status:
                statuses = [s.strip() for s in status.split(",")]
                query = query.where(Appointment.status.in_(statuses))
            else:
                query = query.where(Appointment.status == status)

        if date_filter is not None:
            query = query.where(func.date(Appointment.scheduled_at) == date_filter)
        if establishment_id is not None:
            query = query.where(Appointment.establishment_id == establishment_id)

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
            .options(
                selectinload(Appointment.products).selectinload(AppointmentProduct.product),
                selectinload(Appointment.user),
                selectinload(Appointment.service),
                selectinload(Appointment.staff),
                selectinload(Appointment.establishment),
            )
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

    async def get_by_id(self, appointment_id: UUID) -> Appointment | None:
        """Get one appointment by id with products loaded."""
        query = (
            select(Appointment)
            .where(Appointment.id == appointment_id)
            .options(
                selectinload(Appointment.products).selectinload(AppointmentProduct.product),
                selectinload(Appointment.service),
                selectinload(Appointment.establishment),
                selectinload(Appointment.staff),
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create(self, user_id: UUID, data: AppointmentCreate) -> Appointment:
        """Create appointment."""
        from app.core.metrics import metrics

        start_time = time.time()
        try:
            # Resolve services (primary + optional extras)
            all_service_ids: list[UUID] = [data.service_id]
            if data.service_ids:
                for sid in data.service_ids:
                    if sid not in all_service_ids:
                        all_service_ids.append(sid)

            services_result = await self.db.execute(
                select(Service).where(Service.id.in_(all_service_ids))
            )
            services = {s.id: s for s in services_result.scalars().all()}
            if len(services) != len(all_service_ids):
                raise ValueError("Serviço não encontrado")

            service = services[data.service_id]
            for sid in all_service_ids:
                svc = services[sid]
                if svc.establishment_id != data.establishment_id:
                    raise ValueError("Todos os serviços devem ser do mesmo estabelecimento")

            total_duration = sum(services[sid].duration_minutes for sid in all_service_ids)
            total_service_price = sum(float(services[sid].price) for sid in all_service_ids)
            extra_service_ids = [sid for sid in all_service_ids if sid != data.service_id]

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

            appt_end = appt_start + timedelta(minutes=total_duration)

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
                duration_minutes=total_duration,
                payment_type=data.payment_type,
                payment_method=data.payment_method,
                status=initial_status,
                total_price=total_service_price,
                service_ids=[str(sid) for sid in extra_service_ids] if extra_service_ids else None,
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

                appointment.total_price = total_service_price + total_prod_price

            # ─── Promotion discount ─────────────────────────────────────────────
            subtotal = float(appointment.total_price or 0)
            if data.promotion_id:
                from app.core.exceptions import BusinessError
                from app.services.monetization_service import MonetizationService

                mon_svc = MonetizationService(self.db)
                try:
                    final, discount, promo = await mon_svc.resolve_promotion(
                        data.establishment_id, data.promotion_id, subtotal
                    )
                except BusinessError as e:
                    raise ValueError(e.message) from e
                appointment.total_price = final
                appointment.discount_amount = discount
                appointment.promotion_id = promo.id if promo else None

            # ─── Wallet Payment ──────────────────────────────────────────────────
            if data.payment_method == PaymentMethod.wallet:
                from app.models.payment import Payment, PaymentPurpose, PaymentStatus
                from app.services.monetization_service import MonetizationService

                wallet_service = WalletService(self.db)
                await wallet_service.withdraw_balance(
                    user_id=user_id,
                    amount=appointment.total_price,
                    description=f"Pagamento de agendamento: {service.name}",
                    reference_id=str(appointment.id),
                )
                mon_svc = MonetizationService(self.db)
                platform_fee = await mon_svc.accrue_pending_fee(
                    establishment, float(appointment.total_price)
                )
                self.db.add(
                    Payment(
                        user_id=user_id,
                        establishment_id=data.establishment_id,
                        appointment_id=appointment.id,
                        purpose=PaymentPurpose.single,
                        amount=float(appointment.total_price),
                        platform_fee=platform_fee,
                        gateway_fee=0,
                        net_amount=float(appointment.total_price) - platform_fee,
                        status=PaymentStatus.succeeded,
                    )
                )
                appointment.status = AppointmentStatus.confirmed

            await self.db.commit()

            # Reload with products
            result = await self.db.execute(
                select(Appointment)
                .where(Appointment.id == appointment.id)
                .options(
                    selectinload(Appointment.products).selectinload(AppointmentProduct.product)
                )
            )
            appointment = result.scalar_one()

            # WhatsApp: confirmação de agendamento
            try:
                user_res = await self.db.execute(select(User).where(User.id == appointment.user_id))
                user = user_res.scalar_one_or_none()
                if user and getattr(user, "phone", None):
                    from app.services.whatsapp_service import get_whatsapp_service

                    wa = get_whatsapp_service()
                    date_str = appointment.scheduled_at.strftime("%d/%m/%Y")
                    time_str = appointment.scheduled_at.strftime("%H:%M")
                    await wa.send_appointment_confirmation(
                        user.phone, establishment.name, date_str, time_str
                    )
            except Exception:
                pass  # não falhar o create por falha de notificação

            # Metric: Success
            metrics.count(
                "appointment_created", tags={"establishment_id": str(data.establishment_id)}
            )
            metrics.measure_time("appointment_create_duration", time.time() - start_time)

            return appointment

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
            .options(
                selectinload(Appointment.products).selectinload(AppointmentProduct.product),
                selectinload(Appointment.service),
                selectinload(Appointment.establishment),
            )
        )
        result = await self.db.execute(query)
        appointment = result.scalar_one_or_none()

        if not appointment:
            return None

        if data.scheduled_at is not None:
            await self._validate_slot(
                appointment.establishment_id,
                appointment.service_id,
                appointment.staff_id,
                data.scheduled_at,
                exclude_appointment_id=appointment_id,
            )
            appointment.scheduled_at = data.scheduled_at

        if data.status:
            # WhatsApp: quando status muda para confirmed (ex.: dono confirma agendamento pendente)
            if (
                data.status == AppointmentStatus.confirmed
                and appointment.status != AppointmentStatus.confirmed
            ):
                try:
                    user_res = await self.db.execute(
                        select(User).where(User.id == appointment.user_id)
                    )
                    user = user_res.scalar_one_or_none()
                    est = appointment.establishment
                    if user and getattr(user, "phone", None) and est:
                        from app.services.whatsapp_service import get_whatsapp_service

                        date_str = appointment.scheduled_at.strftime("%d/%m/%Y")
                        time_str = appointment.scheduled_at.strftime("%H:%M")
                        await get_whatsapp_service().send_appointment_confirmation(
                            user.phone, est.name, date_str, time_str
                        )
                except Exception:
                    pass

            # Metric: Status Change
            if (
                data.status == AppointmentStatus.completed
                and appointment.status != AppointmentStatus.completed
            ):
                metrics.count(
                    "appointment_completed",
                    tags={"establishment_id": str(appointment.establishment_id)},
                )

            # If transitioning to COMPLETED and paid in CASH, accrue platform commission
            from app.models.appointment import PaymentMethod
            from app.services.monetization_service import MonetizationService

            if (
                data.status == AppointmentStatus.completed
                and appointment.status != AppointmentStatus.completed
            ):
                from app.services.subscription_service import SubscriptionService

                sub_svc = SubscriptionService(self.db)
                await sub_svc.record_usage_for_completed_appointment(appointment)

            if (
                data.status == AppointmentStatus.completed
                and appointment.status != AppointmentStatus.completed
            ):
                if appointment.payment_method == PaymentMethod.cash:
                    est_query = select(Establishment).where(
                        Establishment.id == appointment.establishment_id
                    )
                    est_res = await self.db.execute(est_query)
                    establishment = est_res.scalar_one()
                    mon_svc = MonetizationService(self.db)
                    await mon_svc.accrue_pending_fee(
                        establishment, float(appointment.total_price or 0)
                    )

            if (
                data.status == AppointmentStatus.completed
                and appointment.status != AppointmentStatus.completed
            ):
                # Check for cashback
                settings_service = SettingsService(self.db)
                cashback_enabled = await settings_service.get_bool(SettingsKeys.CASHBACK_ENABLED)

                if cashback_enabled:
                    cashback_percent = await settings_service.get_float(
                        SettingsKeys.CASHBACK_PERCENT, 2.0
                    )
                    cashback_amount = float(appointment.total_price or 0) * (
                        cashback_percent / 100.0
                    )

                    if cashback_amount > 0:
                        wallet_service = WalletService(self.db)
                        from app.models.wallet import TransactionType

                        await wallet_service.add_balance(
                            user_id=appointment.user_id,
                            amount=cashback_amount,
                            description=f"Cashback: {appointment.service.name if appointment.service else 'Agendamento'}",
                            reference_id=str(appointment.id),
                            tx_type=TransactionType.cashback,
                        )

                # --- Staff Commissions and Goals ---
                from app.services.staff_service import StaffService

                staff_service = StaffService(self.db)
                await staff_service.record_service_completion(
                    staff_id=appointment.staff_id,
                    establishment_id=appointment.establishment_id,
                    amount=float(appointment.total_price),
                    appointment_id=appointment.id,
                )

                # --- Referral Reward ---
                # Check if this is the user's first completed appointment
                from sqlalchemy import and_, func

                first_appt_query = select(func.count(Appointment.id)).where(
                    and_(
                        Appointment.user_id == appointment.user_id,
                        Appointment.status == AppointmentStatus.completed,
                        Appointment.id != appointment.id,
                    )
                )
                first_appt_res = await self.db.execute(first_appt_query)
                completed_count = first_appt_res.scalar() or 0

                if completed_count == 0:
                    # Reward the referrer
                    user_query = select(User).where(User.id == appointment.user_id)
                    user_res = await self.db.execute(user_query)
                    user = user_res.scalar_one()

                    if user.referred_by_id:
                        # Get referral bonus from settings
                        referral_bonus = await settings_service.get_float(
                            SettingsKeys.REFERRAL_BONUS_AMOUNT, 5.0
                        )
                        wallet_service = WalletService(self.db)
                        from app.models.wallet import TransactionType

                        await wallet_service.add_balance(
                            user_id=user.referred_by_id,
                            amount=referral_bonus,
                            description=f"Bônus de indicação: {user.name or user.phone}",
                            reference_id=str(user.id),
                            tx_type=TransactionType.referral,
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

        # WhatsApp: aviso de cancelamento
        try:
            user_res = await self.db.execute(select(User).where(User.id == appointment.user_id))
            user = user_res.scalar_one_or_none()
            if user and getattr(user, "phone", None) and appointment.establishment:
                from app.services.whatsapp_service import get_whatsapp_service

                await get_whatsapp_service().send_appointment_cancelled(
                    user.phone, appointment.establishment.name, reason
                )
        except Exception:
            pass

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

    async def _validate_slot(
        self,
        establishment_id: UUID,
        service_id: UUID,
        staff_id: UUID,
        scheduled_at: datetime,
        exclude_appointment_id: UUID | None = None,
    ) -> None:
        """Validate schedule rules for a slot (shared by create and reschedule)."""
        service_result = await self.db.execute(select(Service).where(Service.id == service_id))
        service = service_result.scalar_one_or_none()
        if not service:
            raise ValueError("Serviço não encontrado")

        staff_result = await self.db.execute(select(StaffMember).where(StaffMember.id == staff_id))
        staff = staff_result.scalar_one_or_none()
        if not staff:
            raise ValueError("Profissional não encontrado")

        appt_start = scheduled_at
        if appt_start.tzinfo is None:
            appt_start = appt_start.replace(tzinfo=UTC)

        appt_end = appt_start + timedelta(minutes=service.duration_minutes)
        weekdays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
        day_key = weekdays[appt_start.weekday()]

        est_result = await self.db.execute(
            select(Establishment).where(Establishment.id == establishment_id)
        )
        establishment = est_result.scalar_one()
        est_hours = establishment.business_hours.get(day_key)
        if not est_hours:
            raise ValueError(f"Estabelecimento fechado em {day_key}")

        staff_hours = staff.work_schedule.get(day_key) if staff.work_schedule else None
        if not staff_hours:
            staff_hours = est_hours
        curr_time = appt_start.strftime("%H:%M")
        if curr_time < staff_hours["open"] or curr_time > staff_hours["close"]:
            raise ValueError(
                f"Horário fora da jornada do profissional ({staff_hours['open']}-{staff_hours['close']})"
            )

        block_result = await self.db.execute(
            select(StaffBlock).where(
                StaffBlock.staff_id == staff_id,
                StaffBlock.start_at < appt_end,
                StaffBlock.end_at > appt_start,
            )
        )
        if block_result.scalar_one_or_none():
            raise ValueError("Profissional indisponível (Bloqueio de agenda)")

        conflict_query = select(Appointment).where(
            Appointment.staff_id == staff_id,
            Appointment.status != AppointmentStatus.cancelled,
            Appointment.scheduled_at < appt_end,
        )
        if exclude_appointment_id:
            conflict_query = conflict_query.where(Appointment.id != exclude_appointment_id)
        conflict_result = await self.db.execute(conflict_query)
        for c in conflict_result.scalars().all():
            c_end = c.scheduled_at + timedelta(minutes=c.duration_minutes)
            if c.scheduled_at < appt_end and c_end > appt_start:
                raise ValueError("Conflito de horário com outro agendamento")

    async def get_available_slots(
        self,
        establishment_id: UUID,
        date_str: str,
        staff_id: UUID | None = None,
    ) -> list[TimeSlot]:
        """Get available time slots."""
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return []

        # 1. Identify Staff
        staff_query = select(StaffMember).where(
            StaffMember.establishment_id == establishment_id,
            StaffMember.active == True,
        )
        if staff_id:
            staff_query = staff_query.where(StaffMember.id == staff_id)
        
        staff_result = await self.db.execute(staff_query)
        staff_members = staff_result.scalars().all()

        if not staff_members:
            return []

        # 2. Get Establishment Hours
        est_result = await self.db.execute(
            select(Establishment).where(Establishment.id == establishment_id)
        )
        establishment = est_result.scalar_one_or_none()
        if not establishment:
            return []

        weekdays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
        day_key = weekdays[target_date.weekday()]
        est_hours = establishment.business_hours.get(day_key)

        # 3. Load Appointments & Blocks for the day
        # We need to query range of the whole day (in UTC)
        # But first, determine day start/end in Sao Paulo time to cover full operational window
        tz_sp = ZoneInfo("America/Sao_Paulo")
        
        # Start of day in SP
        day_start_sp = datetime.combine(target_date, datetime.min.time()).replace(tzinfo=tz_sp)
        # End of day in SP
        day_end_sp = day_start_sp + timedelta(days=1)
        
        # Convert to UTC for DB queries
        day_start_utc = day_start_sp.astimezone(UTC)
        day_end_utc = day_end_sp.astimezone(UTC)

        # 4. Generate All Slots
        # We use a set of strings to avoid duplicates if "Any"
        # But we need to keep track of which staff is available for that slot
        unique_slots: dict[str, TimeSlot] = {}

        for staff in staff_members:
            # Determine effective hours
            # Staff schedule > Establishment schedule
            s_hours = staff.work_schedule.get(day_key) if staff.work_schedule else None
            hours = s_hours or est_hours

            if not hours or hours.get("closed"):
                continue

            try:
                open_time = datetime.strptime(hours["open"], "%H:%M").time()
                close_time = datetime.strptime(hours["close"], "%H:%M").time()
            except (ValueError, KeyError):
                continue

            # Load constraints
            # Appointments
            appts_res = await self.db.execute(
                select(Appointment).where(
                    Appointment.staff_id == staff.id,
                    Appointment.status != AppointmentStatus.cancelled,
                    Appointment.scheduled_at >= day_start_utc,
                    Appointment.scheduled_at < day_end_utc,
                )
            )
            appointments = appts_res.scalars().all()

            # Blocks
            blocks_res = await self.db.execute(
                select(StaffBlock).where(
                    StaffBlock.staff_id == staff.id,
                    StaffBlock.end_at > day_start_utc,
                    StaffBlock.start_at < day_end_utc,
                )
            )
            blocks = blocks_res.scalars().all()

            # Generate slots (30 min intervals)
            # Iterate from open to close in SP Time
            # Parse open/close times as naive, then combine with date and localize
            open_dt_sp = datetime.combine(target_date, open_time).replace(tzinfo=tz_sp)
            close_dt_sp = datetime.combine(target_date, close_time).replace(tzinfo=tz_sp)
            
            curr_dt_sp = open_dt_sp

            # If today, skip past times
            now_utc = datetime.now(UTC)
            
            while curr_dt_sp + timedelta(minutes=30) <= close_dt_sp:
                slot_time_str = curr_dt_sp.strftime("%H:%M")
                
                # Convert current slot to UTC for comparison
                slot_start_utc = curr_dt_sp.astimezone(UTC)
                slot_end_utc = slot_start_utc + timedelta(minutes=30)
                
                # Check if in future (if today)
                if slot_start_utc < now_utc:
                    curr_dt_sp += timedelta(minutes=30)
                    continue

                # Check conflict
                is_free = True

                for appt in appointments:
                    appt_end = appt.scheduled_at + timedelta(minutes=appt.duration_minutes)
                    # Overlap check
                    if slot_start_utc < appt_end and slot_end_utc > appt.scheduled_at:
                        is_free = False
                        break
                
                if is_free:
                    for block in blocks:
                        if slot_start_utc < block.end_at and slot_end_utc > block.start_at:
                            is_free = False
                            break

                if is_free:
                    # If this slot time is not yet in unique_slots, add it
                    # We pick the first staff we find for this slot
                    if slot_time_str not in unique_slots:
                        unique_slots[slot_time_str] = TimeSlot(
                            time=slot_time_str,
                            available=True,
                            staff_id=staff.id,
                            staff_name=staff.name
                        )

                curr_dt_sp += timedelta(minutes=30)

        # Return sorted slots
        sorted_times = sorted(unique_slots.keys())
        return [unique_slots[t] for t in sorted_times]


    async def _get(self, appointment_id: UUID) -> Appointment | None:
        return (
            await self.db.execute(select(Appointment).where(Appointment.id == appointment_id))
        ).scalar_one_or_none()
