"""Staff goal endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.dependencies import verify_establishment_owner
from app.models.staff import StaffMember
from app.schemas.staff_goal import StaffGoalCreate, StaffGoalResponse, StaffGoalUpdate
from app.services.staff_goal_service import StaffGoalService

router = APIRouter(prefix="/staff-goals", tags=["Staff Goals"])


@router.post("", response_model=StaffGoalResponse, status_code=status.HTTP_201_CREATED)
async def create_staff_goal(
    data: StaffGoalCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> StaffGoalResponse:
    """Create a new goal for a staff member (Owner/Admin only)."""
    # Verify ownership of the establishment
    await verify_establishment_owner(db, data.establishment_id, current_user)

    # Verify that the staff belongs to the establishment
    staff_result = await db.execute(
        select(StaffMember).where(
            StaffMember.id == data.staff_id,
            StaffMember.establishment_id == data.establishment_id,
        )
    )
    staff = staff_result.scalar_one_or_none()
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Profissional não encontrado neste estabelecimento"},
        )

    service = StaffGoalService(db)
    goal = await service.create_goal(data)
    return await service.goal_to_response(goal)


@router.get("/staff/{staff_id}", response_model=list[StaffGoalResponse])
async def list_staff_goals(
    staff_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> list[StaffGoalResponse]:
    """List goals for a staff member with progress."""
    # Logic: Only the owner of the staff's establishment or the staff themselves can see
    staff_result = await db.execute(select(StaffMember).where(StaffMember.id == staff_id))
    staff = staff_result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Profissional não encontrado")

    # Check permission
    is_owner = False
    try:
        await verify_establishment_owner(db, staff.establishment_id, current_user)
        is_owner = True
    except HTTPException:
        pass

    if not is_owner and staff.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sem permissão")

    service = StaffGoalService(db)
    goals = await service.list_staff_goals(staff_id)
    return [await service.goal_to_response(g) for g in goals]


@router.get("/my", response_model=list[StaffGoalResponse])
async def list_my_goals(
    db: DBSession,
    current_user: CurrentUser,
) -> list[StaffGoalResponse]:
    """List current staff user's goals with progress."""
    staff_result = await db.execute(
        select(StaffMember).where(StaffMember.user_id == current_user.id)
    )
    staff = staff_result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Usuário não é um profissional registrado")

    service = StaffGoalService(db)
    goals = await service.list_staff_goals(staff.id)
    return [await service.goal_to_response(g) for g in goals]


@router.patch("/{goal_id}", response_model=StaffGoalResponse)
async def update_staff_goal(
    goal_id: UUID,
    data: StaffGoalUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> StaffGoalResponse:
    """Update a staff goal (Owner/Admin only)."""
    service = StaffGoalService(db)
    goal = await service.get_goal(goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Meta não encontrada")

    # Verify ownership
    await verify_establishment_owner(db, goal.establishment_id, current_user)

    updated_goal = await service.update_goal(goal_id, data)
    return await service.goal_to_response(updated_goal)
