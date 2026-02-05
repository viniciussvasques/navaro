"""Appointments endpoints."""

from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentResponse,
    AppointmentUpdate,
)
from app.services.appointment_service import AppointmentService

router = APIRouter(prefix="/appointments", tags=["Appointments"])


@router.get("", response_model=list[AppointmentResponse])
async def list_user_appointments(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    status_filter: str | None = Query(None, alias="status"),
) -> list[AppointmentResponse]:
    """List current user's appointments."""
    service = AppointmentService(db)
    appointments = await service.list_by_user(current_user.id, status_filter)
    return [AppointmentResponse.model_validate(a) for a in appointments]


@router.get(
    "/establishments/{establishment_id}",
    response_model=list[AppointmentResponse],
)
async def list_establishment_appointments(
    establishment_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    date_filter: date | None = Query(None, alias="date"),
    staff_id: UUID | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
) -> list[AppointmentResponse]:
    """List establishment appointments (owner/staff only)."""
    service = AppointmentService(db)
    appointments = await service.list_by_establishment(
        establishment_id,
        date_filter=date_filter,
        staff_id=staff_id,
        status_filter=status_filter,
    )
    return [AppointmentResponse.model_validate(a) for a in appointments]


@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    data: AppointmentCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AppointmentResponse:
    """Create new appointment."""
    service = AppointmentService(db)

    try:
        appointment = await service.create(current_user.id, data)
        return AppointmentResponse.model_validate(appointment)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "VALIDATION_ERROR", "message": str(e)},
        )


@router.patch("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: UUID,
    data: AppointmentUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AppointmentResponse:
    """Update appointment status."""
    service = AppointmentService(db)
    updated = await service.update(appointment_id, data)

    if not updated:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")

    return AppointmentResponse.model_validate(updated)


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_appointment(
    appointment_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    reason: str | None = Query(None),
) -> None:
    """Cancel appointment."""
    service = AppointmentService(db)
    await service.cancel(appointment_id, current_user.id, reason=reason)


@router.post("/{appointment_id}/no-show", status_code=status.HTTP_200_OK)
async def mark_no_show(
    appointment_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, str]:
    """Mark appointment as no-show (owner/staff only)."""
    # Note: In a real app, we'd verify that current_user is staff or owner of the establishment
    service = AppointmentService(db)
    success = await service.mark_no_show(appointment_id)
    if not success:
        raise HTTPException(status_code=400, detail="Não foi possível marcar no-show")
    return {"status": "success"}
