"""Check-ins endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, verify_establishment_access
from app.models.establishment import Establishment
from app.models.notification import NotificationType
from app.models.user import User
from app.schemas.checkin import CheckinRequest, CheckinResponse, QRCodeResponse
from app.services.checkin_service import CheckinService
from app.services.notification_service import NotificationService

router = APIRouter()


@router.get(
    "/establishments/{establishment_id}/qr",
    response_model=QRCodeResponse,
)
async def generate_qr_code(
    establishment_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> QRCodeResponse:
    """Generate QR code for check-in (owner/staff only)."""
    await verify_establishment_access(db, establishment_id, current_user)

    service = CheckinService(db)
    qr_data = await service.generate_qr_token(establishment_id)
    return QRCodeResponse(**qr_data)


@router.post("", response_model=CheckinResponse)
async def perform_checkin(
    data: CheckinRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CheckinResponse:
    """Perform check-in by scanning QR code."""
    service = CheckinService(db)

    try:
        result = await service.perform_checkin(current_user.id, data.qr_token)

        # Notify establishment owner
        # We need to find the establishment owner
        est_id = result.get("establishment_id")
        if est_id:
            est_result = await db.execute(select(Establishment).where(Establishment.id == est_id))
            establishment = est_result.scalar_one_or_none()
            if establishment:
                notif_service = NotificationService(db)
                await notif_service.create_in_app(
                    user_id=establishment.owner_id,
                    title="Novo Check-in!",
                    message=f"O cliente {current_user.name or 'Anônimo'} acabou de fazer check-in.",
                    type=NotificationType.checkin,
                    data={"establishment_id": str(est_id), "user_id": str(current_user.id)},
                )

        return CheckinResponse(**result)
    except ValueError as e:
        error_code = "CHECKIN_ERROR"
        message = str(e)

        # Specific error codes
        if "diário" in message.lower() or "daily" in message.lower():
            error_code = "DAILY_LIMIT_REACHED"
        elif "semanal" in message.lower() or "weekly" in message.lower():
            error_code = "WEEKLY_LIMIT_REACHED"
        elif "agendamento" in message.lower() or "appointment" in message.lower():
            error_code = "NO_APPOINTMENT"
        elif "assinatura" in message.lower() or "subscription" in message.lower():
            error_code = "SUBSCRIPTION_INACTIVE"

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": error_code, "message": message},
        )
