"""Check-ins endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, verify_establishment_owner
from app.models.user import User
from app.schemas.checkin import CheckinRequest, CheckinResponse, QRCodeResponse
from app.services.checkin_service import CheckinService

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
    # TODO: Also allow staff members
    await verify_establishment_owner(db, establishment_id, current_user.id)
    
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
