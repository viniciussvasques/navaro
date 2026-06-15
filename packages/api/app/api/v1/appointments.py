"""Appointments endpoints."""

from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, verify_establishment_access
from app.models.appointment import Appointment
from app.models.user import User
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentResponse,
    AppointmentUpdate,
)
from app.services.appointment_service import AppointmentService

router = APIRouter(prefix="/appointments", tags=["Appointments"])


def _appointment_response(appointment: Appointment) -> AppointmentResponse:
    """Build appointment response with optional relation labels."""
    user = getattr(appointment, "user", None)
    return AppointmentResponse.model_validate({
        **{k: getattr(appointment, k) for k in (
            "id", "user_id", "establishment_id", "service_id", "staff_id",
            "subscription_id", "scheduled_at", "duration_minutes", "status",
            "payment_type", "payment_method", "total_price", "discount_amount",
            "promotion_id", "created_at",
        )},
        "products": [
            {
                "product_id": ap.product_id,
                "name": ap.product.name if ap.product else "Produto",
                "quantity": ap.quantity,
                "unit_price": float(ap.unit_price),
            }
            for ap in (appointment.products or [])
        ],
        "establishment_name": appointment.establishment.name if getattr(appointment, "establishment", None) else None,
        "service_name": appointment.service.name if getattr(appointment, "service", None) else None,
        "staff_name": appointment.staff.name if getattr(appointment, "staff", None) else None,
        "user_name": user.name if user else None,
        "user_phone": user.phone if user else None,
    })


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


@router.get("/my", response_model=list[AppointmentResponse])
async def list_my_appointments(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    date_filter: date | None = Query(None, alias="date"),
    establishment_id: UUID | None = Query(None),
) -> list[AppointmentResponse]:
    """List current user's appointments (optional filter by date and establishment). Used by app for check-in flow."""
    service = AppointmentService(db)
    appointments = await service.list_by_user(
        current_user.id,
        date_filter=date_filter,
        establishment_id=establishment_id,
    )
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
    await verify_establishment_access(db, establishment_id, current_user)
    service = AppointmentService(db)
    appointments = await service.list_by_establishment(
        establishment_id,
        date_filter=date_filter,
        staff_id=staff_id,
        status_filter=status_filter,
    )
    return [_appointment_response(a) for a in appointments]


@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(
    appointment_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AppointmentResponse:
    """Get one appointment by id (owner only)."""
    service = AppointmentService(db)
    appointment = await service.get_by_id(appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")
    if appointment.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")
    data = {
        **{k: getattr(appointment, k) for k in ("id", "user_id", "establishment_id", "service_id", "staff_id", "subscription_id", "scheduled_at", "duration_minutes", "status", "payment_type", "payment_method", "total_price", "discount_amount", "promotion_id", "created_at")},
        "products": [
            {"product_id": ap.product_id, "name": ap.product.name if ap.product else "Produto", "quantity": ap.quantity, "unit_price": float(ap.unit_price)}
            for ap in (appointment.products or [])
        ],
        "establishment_name": appointment.establishment.name if appointment.establishment else None,
        "service_name": appointment.service.name if appointment.service else None,
        "staff_name": appointment.staff.name if appointment.staff else None,
    }
    return AppointmentResponse.model_validate(data)


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
        loaded = await service.get_by_id(appointment.id)
        if not loaded:
            raise HTTPException(status_code=500, detail="Erro ao carregar agendamento criado")
        return AppointmentResponse.model_validate({
            **{k: getattr(loaded, k) for k in (
                "id", "user_id", "establishment_id", "service_id", "staff_id",
                "subscription_id", "scheduled_at", "duration_minutes", "status",
                "payment_type", "payment_method", "total_price", "discount_amount",
                "promotion_id", "created_at",
            )},
            "products": [
                {
                    "product_id": ap.product_id,
                    "name": ap.product.name if ap.product else "Produto",
                    "quantity": ap.quantity,
                    "unit_price": float(ap.unit_price),
                }
                for ap in (loaded.products or [])
            ],
            "establishment_name": loaded.establishment.name if loaded.establishment else None,
            "service_name": loaded.service.name if loaded.service else None,
            "staff_name": loaded.staff.name if loaded.staff else None,
        })
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
    """Update appointment (status or products). Only owner can add products; only establishment can change status."""
    service = AppointmentService(db)
    existing = await service.get_by_id(appointment_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")
    if data.products is not None and existing.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Só o cliente pode adicionar produtos ao agendamento.")
    if data.status is not None:
        await verify_establishment_access(db, existing.establishment_id, current_user)
    if data.scheduled_at is not None and existing.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Só o cliente pode reagendar o horário.")
    try:
        updated = await service.update(appointment_id, data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "VALIDATION_ERROR", "message": str(e)},
        ) from e
    if not updated:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")
    updated_with_relations = await service.get_by_id(appointment_id)
    data_resp = {
        **{k: getattr(updated_with_relations, k) for k in ("id", "user_id", "establishment_id", "service_id", "staff_id", "subscription_id", "scheduled_at", "duration_minutes", "status", "payment_type", "payment_method", "total_price", "discount_amount", "promotion_id", "created_at")},
        "products": [
            {"product_id": ap.product_id, "name": ap.product.name if ap.product else "Produto", "quantity": ap.quantity, "unit_price": float(ap.unit_price)}
            for ap in (updated_with_relations.products or [])
        ],
        "establishment_name": updated_with_relations.establishment.name if updated_with_relations.establishment else None,
        "service_name": updated_with_relations.service.name if updated_with_relations.service else None,
        "staff_name": updated_with_relations.staff.name if updated_with_relations.staff else None,
    }
    return AppointmentResponse.model_validate(data_resp)


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
    # Verify permission
    appointment = await db.get(Appointment, appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")

    await verify_establishment_access(db, appointment.establishment_id, current_user)

    service = AppointmentService(db)
    success = await service.mark_no_show(appointment_id)
    if not success:
        raise HTTPException(status_code=400, detail="Não foi possível marcar no-show")
    return {"status": "success"}
