"""Tips endpoints."""

from collections.abc import Sequence

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app.api.deps import DBSession, get_current_user
from app.models.appointment import Appointment
from app.models.payment import PaymentStatus, Tip
from app.models.staff import StaffMember
from app.models.user import User
from app.schemas.payment import TipCreate, TipResponse

router = APIRouter(prefix="/tips", tags=["Tips"])


@router.post("/", response_model=TipResponse)
async def create_tip(
    request: TipCreate,
    db: DBSession,
    current_user: User = Depends(get_current_user),
) -> Tip:
    """Give a tip to a staff member."""
    # Validate staff
    staff_result = await db.execute(select(StaffMember).where(StaffMember.id == request.staff_id))
    staff = staff_result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Profissional não encontrado")

    # Validate appointment (if provided)
    if request.appointment_id:
        appt_result = await db.execute(
            select(Appointment).where(
                Appointment.id == request.appointment_id, Appointment.user_id == current_user.id
            )
        )
        appointment = appt_result.scalar_one_or_none()
        if not appointment:
            raise HTTPException(
                status_code=404, detail="Agendamento não encontrado ou não pertence ao usuário"
            )

    tip = Tip(
        user_id=current_user.id,
        staff_id=request.staff_id,
        establishment_id=staff.establishment_id,
        appointment_id=request.appointment_id,
        amount=request.amount,
        status=PaymentStatus.succeeded,  # Simulating immediate success for now
    )

    db.add(tip)
    await db.commit()
    await db.refresh(tip)
    return tip


@router.get("/me", response_model=Sequence[TipResponse])
async def list_my_tips(
    db: DBSession,
    current_user: User = Depends(get_current_user),
) -> Sequence[Tip]:
    """List tips given by current user."""
    result = await db.execute(
        select(Tip).where(Tip.user_id == current_user.id).order_by(Tip.created_at.desc())
    )
    return result.scalars().all()
