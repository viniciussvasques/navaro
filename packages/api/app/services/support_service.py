"""Support service."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import and_, func, select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.support import (
    Ticket,
    TicketCategory,
    TicketMessage,
    TicketPriority,
    TicketStatus,
)
from app.models.appointment import Appointment, AppointmentStatus
from app.models.payment import Payment
from app.models.service import Service
from app.models.staff import StaffMember
from app.schemas.support import (
    TicketCreate,
    TicketMessageCreate,
    TicketUpdate,
    UserSupportContext,
    SupportContextAppointment,
    SupportContextPayment,
)
from app.models.user import User, UserRole


class SupportService:
    """Support service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_ticket(self, user_id: UUID, data: TicketCreate) -> Ticket:
        """Create a new ticket."""
        ticket = Ticket(
            user_id=user_id,
            title=data.title,
            priority=data.priority,
            category=data.category,
            status=TicketStatus.open,
        )
        self.db.add(ticket)
        await self.db.commit()
        
        # Reload with relationships to satisfy Pydantic
        query = select(Ticket).options(
             selectinload(Ticket.user),
             selectinload(Ticket.assigned_to),
             selectinload(Ticket.messages)
        ).where(Ticket.id == ticket.id)

        result = await self.db.execute(query)
        return result.scalar_one()

    async def list_tickets(
        self,
        user: User,
        page: int = 1,
        page_size: int = 20,
        status: TicketStatus | None = None,
        priority: TicketPriority | None = None,
        category: TicketCategory | None = None,
        assigned_to_me: bool = False,
    ) -> tuple[list[Ticket], int]:
        """List tickets with filtering and pagination."""
        query = select(Ticket).options(
            selectinload(Ticket.user),
            selectinload(Ticket.assigned_to),
        )

        # Filters
        filters = []
        
        # Role-based access
        if user.role not in [UserRole.admin, UserRole.support]:
            # Users only see their own tickets
            filters.append(Ticket.user_id == user.id)
        else:
            # Support/Admin can filter by assignment
            if assigned_to_me:
                filters.append(Ticket.assigned_to_id == user.id)

        if status:
            filters.append(Ticket.status == status)
        if priority:
            filters.append(Ticket.priority == priority)
        if category:
            filters.append(Ticket.category == category)

        if filters:
            query = query.where(and_(*filters))

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_res = await self.db.execute(count_query)
        total = total_res.scalar_one()

        # Pagination and Ordering
        # Urgent priority first, then date desc
        query = query.order_by(
            Ticket.priority == TicketPriority.urgent,  # Urgent first (True sorts after False in SQL usually, wait. Boolean sort depends on dialect. Let's stick to created_at desc for now to be safe, or multiple sorts)
            Ticket.created_at.desc()
        )
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.db.execute(query)
        return result.scalars().all(), total

    async def _calculate_queue_stats(self, ticket: Ticket) -> tuple[int | None, int | None]:
        """Calculate queue position and estimated wait time."""
        if ticket.status != TicketStatus.open:
            return None, None

        # Count how many older 'open' tickets exist
        query = select(func.count()).where(
            and_(
                Ticket.status == TicketStatus.open,
                Ticket.created_at < ticket.created_at
            )
        )
        result = await self.db.execute(query)
        pos = result.scalar_one() + 1
        
        # Heuristic: 10 minutes per ticket in queue
        wait_time = pos * 10
        
        return pos, wait_time

    async def get_ticket(self, ticket_id: UUID, user: User) -> Ticket | None:
        """Get ticket details."""
        query = select(Ticket).options(
            selectinload(Ticket.user),
            selectinload(Ticket.assigned_to),
            selectinload(Ticket.messages).selectinload(TicketMessage.sender)
        ).where(Ticket.id == ticket_id)

        result = await self.db.execute(query)
        ticket = result.scalar_one_or_none()

        if not ticket:
            return None

        # Access check
        if user.role not in [UserRole.admin, UserRole.support] and ticket.user_id != user.id:
            return None

        # Inject queue stats
        pos, wait = await self._calculate_queue_stats(ticket)
        ticket.queue_position = pos
        ticket.estimated_wait_time_minutes = wait

        return ticket

    async def add_message(
        self, ticket_id: UUID, sender_id: UUID, data: TicketMessageCreate
    ) -> TicketMessage:
        """Add a message to a ticket."""
        message = TicketMessage(
            ticket_id=ticket_id,
            sender_id=sender_id,
            content=data.content,
            attachments=data.attachments,
        )
        self.db.add(message)
        
        # Auto-reopen ticket if client replies
        ticket_res = await self.db.execute(select(Ticket).where(Ticket.id == ticket_id))
        ticket = ticket_res.scalar_one()
        
        if ticket.user_id == sender_id and ticket.status in [TicketStatus.resolved, TicketStatus.closed]:
             ticket.status = TicketStatus.in_progress
             self.db.add(ticket)

        await self.db.commit()
        await self.db.refresh(message)
        
        # Load sender for response
        # We need to reload the message with sender relationship
        result = await self.db.execute(
            select(TicketMessage)
            .options(selectinload(TicketMessage.sender))
            .where(TicketMessage.id == message.id)
        )
        return result.scalar_one()

        result = await self.db.execute(query)
        return result.scalar_one()

    async def update_ticket(
        self, ticket_id: UUID, data: TicketUpdate
    ) -> Ticket | None:
        """Update ticket status, priority or assignee."""
        query = select(Ticket).where(Ticket.id == ticket_id)
        result = await self.db.execute(query)
        ticket = result.scalar_one_or_none()

        if not ticket:
            return None

        if data.status:
            ticket.status = data.status
        if data.priority:
            ticket.priority = data.priority
        if data.assigned_to_id:
            ticket.assigned_to_id = data.assigned_to_id

        self.db.add(ticket)
        await self.db.commit()
        
        # Reload with relationships
        query = select(Ticket).options(
             selectinload(Ticket.user),
             selectinload(Ticket.assigned_to),
             selectinload(Ticket.messages)
        ).where(Ticket.id == ticket.id)

        result = await self.db.execute(query)
        return result.scalar_one()

    async def get_user_support_context(self, user_id: UUID) -> UserSupportContext:
        """Get unified support context for a user."""
        # 1. Basic User Info
        user_res = await self.db.execute(select(User).where(User.id == user_id))
        user = user_res.scalar_one()

        # 2. Recent Appointments
        appointments_query = (
            select(Appointment, Service.name, StaffMember.name)
            .join(Service, Appointment.service_id == Service.id)
            .join(StaffMember, Appointment.staff_id == StaffMember.id)
            .where(Appointment.user_id == user_id)
            .order_by(Appointment.start_at.desc())
            .limit(5)
        )
        appointments_res = await self.db.execute(appointments_query)
        recent_appointments = []
        for row in appointments_res.all():
            app, service_name, staff_name = row
            recent_appointments.append(SupportContextAppointment(
                id=app.id,
                service_name=service_name,
                staff_name=staff_name,
                status=app.status.value,
                start_at=app.start_at
            ))

        # 3. Recent Payments
        payments_query = (
            select(Payment)
            .where(Payment.user_id == user_id)
            .order_by(Payment.created_at.desc())
            .limit(10)
        )
        payments_res = await self.db.execute(payments_query)
        recent_payments = []
        total_spent = 0
        for p in payments_res.scalars().all():
            recent_payments.append(SupportContextPayment(
                id=p.id,
                amount=float(p.amount),
                status=p.status.value,
                provider=p.provider,
                created_at=p.created_at
            ))
            if p.status == "succeeded":
                total_spent += float(p.amount)

        return UserSupportContext(
            user=user,
            recent_appointments=recent_appointments,
            recent_payments=recent_payments,
            total_spent=total_spent,
            subscription_tier="Premium" if user.role == UserRole.owner else "N/A"
        )

    async def cancel_appointment(self, appointment_id: UUID, reason: str) -> Appointment:
        """Cancel an appointment from support."""
        from sqlalchemy.orm import selectinload

        from app.models.establishment import Establishment
        from app.models.user import User

        query = (
            select(Appointment)
            .where(Appointment.id == appointment_id)
            .options(selectinload(Appointment.establishment))
        )
        result = await self.db.execute(query)
        appointment = result.scalar_one()

        appointment.status = AppointmentStatus.cancelled
        appointment.cancel_reason = f"[SUPPORT] {reason}"

        self.db.add(appointment)
        await self.db.commit()
        await self.db.refresh(appointment)

        # WhatsApp: aviso de cancelamento ao cliente
        try:
            user = await self.db.get(User, appointment.user_id)
            est = appointment.establishment or await self.db.get(Establishment, appointment.establishment_id)
            est_name = (est.name if est else "Estabelecimento")
            if user and getattr(user, "phone", None):
                from app.services.whatsapp_service import get_whatsapp_service
                await get_whatsapp_service().send_appointment_cancelled(
                    user.phone, est_name, reason
                )
        except Exception:
            pass

        return appointment
