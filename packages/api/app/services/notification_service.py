"""Notification service with multi-party SMS support."""

from collections.abc import Sequence
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import desc, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.appointment import Appointment
from app.models.establishment import Establishment
from app.models.notification import Notification, NotificationType
from app.models.staff import StaffMember
from app.models.user import User
from app.services.sms_service import get_sms_service


class NotificationService:
    """Notification service with SMS and multi-party support."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.sms = get_sms_service()

    async def notify(
        self,
        user_id: UUID,
        title: str,
        message: str,
        type: NotificationType = NotificationType.system,
        data: dict | None = None,
        send_sms: bool = False,
        sms_message: str | None = None,
    ) -> Notification:
        """
        Send/Create a notification for a user.

        Args:
            user_id: Target user ID
            title: Notification title
            message: Notification message (in-app)
            type: Notification type
            data: Additional data
            send_sms: If True, also send SMS
            sms_message: Custom SMS message (uses `message` if not provided)
        """
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=type,
            data=data or {},
            is_read=False,
        )
        self.db.add(notification)
        await self.db.commit()
        await self.db.refresh(notification)

        # Send SMS if requested
        if send_sms:
            user = await self.db.get(User, user_id)
            if user and user.phone:
                await self.sms.send(user.phone, sms_message or message)

        return notification

    # ─── Multi-Party Notifications ──────────────────────────────────────────────

    async def notify_appointment_created(self, appointment: Appointment) -> None:
        """Notify all parties when appointment is created."""
        # Fetch related entities
        user = await self.db.get(User, appointment.user_id)
        establishment = await self.db.get(Establishment, appointment.establishment_id)
        owner = await self.db.get(User, establishment.owner_id) if establishment else None
        staff = (
            await self.db.get(StaffMember, appointment.staff_id) if appointment.staff_id else None
        )

        if not user or not establishment:
            return

        date_str = appointment.scheduled_at.strftime("%d/%m")
        time_str = appointment.scheduled_at.strftime("%H:%M")

        # 1. Notify Client (SMS + Push)
        await self.notify(
            user_id=user.id,
            title="Agendamento Confirmado! ✂️",
            message=f"Seu horário em {establishment.name} foi confirmado para {date_str} às {time_str}.",
            type=NotificationType.appointment,
            data={"appointment_id": str(appointment.id)},
            send_sms=True,
            sms_message=f"Navaro: Agendamento confirmado para {date_str} às {time_str} em {establishment.name}.",
        )

        # 2. Notify Owner (Push only)
        if owner:
            await self.notify(
                user_id=owner.id,
                title="Novo Agendamento 📅",
                message=f"{user.name or 'Cliente'} agendou para {date_str} às {time_str}.",
                type=NotificationType.appointment,
                data={"appointment_id": str(appointment.id)},
            )

        # 3. Notify Staff (Push only)
        if staff and staff.user_id:
            await self.notify(
                user_id=staff.user_id,
                title="Novo Cliente 👤",
                message=f"{user.name or 'Cliente'} agendou com você para {date_str} às {time_str}.",
                type=NotificationType.appointment,
                data={"appointment_id": str(appointment.id)},
            )

    async def notify_appointment_cancelled(
        self, appointment: Appointment, cancelled_by: str = "client"
    ) -> None:
        """Notify all parties when appointment is cancelled."""
        user = await self.db.get(User, appointment.user_id)
        establishment = await self.db.get(Establishment, appointment.establishment_id)
        owner = await self.db.get(User, establishment.owner_id) if establishment else None

        if not user or not establishment:
            return

        date_str = appointment.scheduled_at.strftime("%d/%m às %H:%M")

        # Notify client
        if cancelled_by != "client":
            await self.notify(
                user_id=user.id,
                title="Agendamento Cancelado ❌",
                message=f"Seu horário em {establishment.name} ({date_str}) foi cancelado.",
                type=NotificationType.appointment,
                send_sms=True,
                sms_message=f"Navaro: Seu agendamento em {establishment.name} foi cancelado.",
            )

        # Notify owner
        if owner and cancelled_by != "owner":
            await self.notify(
                user_id=owner.id,
                title="Agendamento Cancelado ❌",
                message=f"{user.name or 'Cliente'} cancelou o horário de {date_str}.",
                type=NotificationType.appointment,
            )

    async def notify_checkin_success(self, user_id: UUID, establishment_id: UUID) -> None:
        """Notify when client checks in."""
        user = await self.db.get(User, user_id)
        establishment = await self.db.get(Establishment, establishment_id)
        owner = await self.db.get(User, establishment.owner_id) if establishment else None

        if not user or not establishment:
            return

        # Notify client
        await self.notify(
            user_id=user.id,
            title="Check-in Realizado! ✅",
            message=f"Bem-vindo(a) a {establishment.name}! Você será atendido em breve.",
            type=NotificationType.system,
        )

        # Notify owner
        if owner:
            await self.notify(
                user_id=owner.id,
                title="Cliente Chegou! 👋",
                message=f"{user.name or 'Cliente'} fez check-in.",
                type=NotificationType.system,
            )

    async def notify_payment_received(
        self, establishment_id: UUID, amount: float, customer_name: str | None = None
    ) -> None:
        """Notify establishment owner about received payment."""
        establishment = await self.db.get(Establishment, establishment_id)
        if not establishment:
            return

        owner = await self.db.get(User, establishment.owner_id)
        if not owner:
            return

        await self.notify(
            user_id=owner.id,
            title="Pagamento Recebido! 💰",
            message=f"R${amount:.2f} recebido" + (f" de {customer_name}" if customer_name else ""),
            type=NotificationType.payment,
            send_sms=True,
            sms_message=f"Navaro: Pagamento de R${amount:.2f} recebido em {establishment.name}.",
        )

    # ─── Basic Operations ───────────────────────────────────────────────────────

    async def list_user_notifications(
        self, user_id: UUID, skip: int = 0, limit: int = 20
    ) -> tuple[Sequence[Notification], int, int]:
        """List user notifications with total and unread count."""
        query = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(desc(Notification.created_at))
        )

        total_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(total_query)
        total = total_result.scalar() or 0

        unread_query = select(func.count()).where(
            Notification.user_id == user_id, Notification.is_read == False
        )
        unread_result = await self.db.execute(unread_query)
        unread_count = unread_result.scalar() or 0

        result = await self.db.execute(query.offset(skip).limit(limit))
        items = result.scalars().all()

        return items, total, unread_count

    async def mark_read(self, user_id: UUID, notification_id: UUID) -> Notification:
        """Mark a specific notification as read."""
        result = await self.db.execute(
            select(Notification).where(
                Notification.id == notification_id, Notification.user_id == user_id
            )
        )
        notification = result.scalar_one_or_none()
        if not notification:
            raise NotFoundError("Notificação")

        notification.is_read = True
        await self.db.commit()
        await self.db.refresh(notification)
        return notification

    async def mark_all_read(self, user_id: UUID) -> int:
        """Mark all notifications for a user as read."""
        result = await self.db.execute(
            update(Notification)
            .where(Notification.user_id == user_id, Notification.is_read == False)
            .values(is_read=True)
        )
        await self.db.commit()
        return result.rowcount

    async def send_reengagement_reminders(self, establishment_id: UUID) -> int:
        """Find users who haven't had an appointment in 21 days and send reminder."""
        threshold = datetime.now(UTC) - timedelta(days=21)

        query = (
            select(Appointment.user_id)
            .where(Appointment.establishment_id == establishment_id)
            .group_by(Appointment.user_id)
            .having(func.max(Appointment.scheduled_at) < threshold)
        )

        result = await self.db.execute(query)
        user_ids = result.scalars().all()

        count = 0
        for uid in user_ids:
            await self.notify(
                user_id=uid,
                title="Saudades! ✂️",
                message="Já faz algumas semanas desde o seu último atendimento. Que tal agendar?",
                type=NotificationType.system,
                data={"establishment_id": str(establishment_id)},
            )
            count += 1

        return count
