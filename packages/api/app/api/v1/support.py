"""Support endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import DBSession, CurrentUser
from app.models.support import TicketCategory, TicketPriority, TicketStatus
from app.models.user import UserRole
from app.schemas.support import (
    TicketCreate,
    TicketListResponse,
    TicketMessageCreate,
    TicketMessageResponse,
    TicketResponse,
    TicketUpdate,
    UserSupportContext,
    CancelAppointmentRequest,
)
from app.services.support_service import SupportService

router = APIRouter(prefix="/support", tags=["Support"])


@router.post("/tickets", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    data: TicketCreate,
    current_user: CurrentUser,
    db: DBSession,
):
    """Create a new support ticket."""
    service = SupportService(db)
    return await service.create_ticket(current_user.id, data)


@router.get("/tickets", response_model=TicketListResponse)
async def list_tickets(
    current_user: CurrentUser,
    db: DBSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: TicketStatus | None = None,
    priority: TicketPriority | None = None,
    category: TicketCategory | None = None,
    assigned_to_me: bool = False,
):
    """List support tickets."""
    service = SupportService(db)
    items, total = await service.list_tickets(
        user=current_user,
        page=page,
        page_size=page_size,
        status=status,
        priority=priority,
        category=category,
        assigned_to_me=assigned_to_me,
    )
    return TicketListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/tickets/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
):
    """Get ticket details."""
    service = SupportService(db)
    ticket = await service.get_ticket(ticket_id, current_user)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.patch("/tickets/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: UUID,
    data: TicketUpdate,
    current_user: CurrentUser,
    db: DBSession,
):
    """Update ticket (Support/Admin only)."""
    if current_user.role not in [UserRole.admin, UserRole.support]:
        raise HTTPException(status_code=403, detail="Not authorized")

    service = SupportService(db)
    ticket = await service.update_ticket(ticket_id, data)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.post("/tickets/{ticket_id}/messages", response_model=TicketMessageResponse)
async def add_message(
    ticket_id: UUID,
    data: TicketMessageCreate,
    current_user: CurrentUser,
    db: DBSession,
):
    """Add message to ticket."""
    service = SupportService(db)
    
    # Check access first
    ticket = await service.get_ticket(ticket_id, current_user)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    return await service.add_message(ticket_id, current_user.id, data)


@router.get("/tickets/{ticket_id}/context", response_model=UserSupportContext)
async def get_ticket_context(
    ticket_id: UUID,
    current_user: CurrentUser,
    db: DBSession,
):
    """Get unified customer context for a ticket (Support/Admin only)."""
    if current_user.role not in [UserRole.admin, UserRole.support]:
        raise HTTPException(status_code=403, detail="Not authorized")

    service = SupportService(db)
    ticket = await service.get_ticket(ticket_id, current_user)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    return await service.get_user_support_context(ticket.user_id)


@router.post("/tickets/{ticket_id}/appointments/{appointment_id}/cancel")
async def cancel_ticket_appointment(
    ticket_id: UUID,
    appointment_id: UUID,
    data: CancelAppointmentRequest,
    current_user: CurrentUser,
    db: DBSession,
):
    """Cancel an appointment related to a ticket (Support/Admin only)."""
    if current_user.role not in [UserRole.admin, UserRole.support]:
        raise HTTPException(status_code=403, detail="Not authorized")

    service = SupportService(db)
    # Verify ticket exists and belongs to the same user as the appointment (simplified check)
    ticket = await service.get_ticket(ticket_id, current_user)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    return await service.cancel_appointment(appointment_id, data.reason)
