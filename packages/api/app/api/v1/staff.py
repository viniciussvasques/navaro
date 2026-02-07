"""Staff endpoints."""

from uuid import UUID

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.exceptions import ForbiddenError, NotFoundError
from app.models import Establishment, StaffBlock, StaffContractType, StaffMember, UserRole
from app.schemas.staff import StaffBlockCreate, StaffBlockResponse

router = APIRouter(prefix="/establishments/{establishment_id}/staff", tags=["Staff"])


# ─── Schemas ───────────────────────────────────────────────────────────────────


class StaffCreate(BaseModel):
    """Create staff request."""

    name: str = Field(..., min_length=2, max_length=200)
    phone: str | None = Field(None, max_length=20)
    role: str = Field("barbeiro", max_length=100)
    avatar_url: str | None = Field(None, max_length=500)
    bio: str | None = Field(None, max_length=1000)
    contract_type: StaffContractType = StaffContractType.commission_only
    base_salary: float | None = Field(None, ge=0)
    commission_rate: float | None = Field(None, ge=0, le=100)
    work_schedule: dict | None = Field(default_factory=dict)
    user_id: UUID | None = None


class StaffUpdate(BaseModel):
    """Update staff request."""

    name: str | None = Field(None, max_length=200)
    phone: str | None = Field(None, max_length=20)
    role: str | None = Field(None, max_length=100)
    avatar_url: str | None = Field(None, max_length=500)
    bio: str | None = Field(None, max_length=1000)
    contract_type: StaffContractType | None = None
    base_salary: float | None = Field(None, ge=0)
    commission_rate: float | None = Field(None, ge=0, le=100)
    work_schedule: dict | None = None
    active: bool | None = None
    user_id: UUID | None = None


class StaffResponse(BaseModel):
    """Staff response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    phone: str | None
    role: str
    bio: str | None
    avatar_url: str | None
    contract_type: str
    base_salary: float | None
    work_schedule: dict
    commission_rate: float | None
    user_id: str | None
    active: bool


# ─── Helpers ───────────────────────────────────────────────────────────────────


async def get_establishment_or_404(db: DBSession, establishment_id: UUID) -> Establishment:
    """Get establishment or raise 404."""
    result = await db.execute(select(Establishment).where(Establishment.id == establishment_id))
    establishment = result.scalar_one_or_none()
    if not establishment:
        raise NotFoundError("Estabelecimento")
    return establishment


def check_ownership(establishment: Establishment, user: CurrentUser) -> None:
    """Check if user owns the establishment."""
    if establishment.owner_id != user.id and user.role != UserRole.admin:
        raise ForbiddenError()


# ─── Endpoints ─────────────────────────────────────────────────────────────────


@router.get("", response_model=list[StaffResponse])
async def list_staff(
    establishment_id: UUID,
    db: DBSession,
    active_only: bool = True,
) -> list[StaffResponse]:
    """List staff members for an establishment."""
    query = select(StaffMember).where(StaffMember.establishment_id == establishment_id)

    if active_only:
        query = query.where(StaffMember.active == True)

    query = query.order_by(StaffMember.name)

    result = await db.execute(query)
    staff = result.scalars().all()

    return [
        StaffResponse(
            id=str(s.id),
            name=s.name,
            phone=s.phone,
            role=s.role,
            bio=s.bio,
            avatar_url=s.avatar_url,
            contract_type=s.contract_type.value,
            base_salary=float(s.base_salary) if s.base_salary else None,
            work_schedule=s.work_schedule,
            commission_rate=float(s.commission_rate) if s.commission_rate else None,
            user_id=str(s.user_id) if s.user_id else None,
            active=s.active,
        )
        for s in staff
    ]


@router.post("", response_model=StaffResponse, status_code=201)
async def create_staff(
    establishment_id: UUID,
    request: StaffCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> StaffResponse:
    """Create new staff member."""
    establishment = await get_establishment_or_404(db, establishment_id)
    check_ownership(establishment, current_user)

    staff = StaffMember(
        establishment_id=establishment_id,
        name=request.name,
        phone=request.phone,
        role=request.role,
        bio=request.bio,
        contract_type=request.contract_type,
        base_salary=request.base_salary,
        avatar_url=request.avatar_url,
        commission_rate=request.commission_rate,
        work_schedule=request.work_schedule or {},
        user_id=request.user_id,
    )

    db.add(staff)
    await db.commit()
    await db.refresh(staff)

    return StaffResponse(
        id=str(staff.id),
        name=staff.name,
        phone=staff.phone,
        role=staff.role,
        bio=staff.bio,
        contract_type=staff.contract_type.value,
        base_salary=float(staff.base_salary) if staff.base_salary else None,
        avatar_url=staff.avatar_url,
        work_schedule=staff.work_schedule,
        commission_rate=float(staff.commission_rate) if staff.commission_rate else None,
        user_id=str(staff.user_id) if staff.user_id else None,
        active=staff.active,
    )


@router.get("/{staff_id}", response_model=StaffResponse)
async def get_staff(
    establishment_id: UUID,
    staff_id: UUID,
    db: DBSession,
) -> StaffResponse:
    """Get staff member by ID."""
    result = await db.execute(
        select(StaffMember).where(
            StaffMember.id == staff_id,
            StaffMember.establishment_id == establishment_id,
        )
    )
    staff = result.scalar_one_or_none()

    if not staff:
        raise NotFoundError("Funcionário")

    return StaffResponse(
        id=str(staff.id),
        name=staff.name,
        phone=staff.phone,
        role=staff.role,
        bio=staff.bio,
        contract_type=staff.contract_type.value,
        base_salary=float(staff.base_salary) if staff.base_salary else None,
        avatar_url=staff.avatar_url,
        work_schedule=staff.work_schedule,
        commission_rate=float(staff.commission_rate) if staff.commission_rate else None,
        user_id=str(staff.user_id) if staff.user_id else None,
        active=staff.active,
    )


@router.patch("/{staff_id}", response_model=StaffResponse)
async def update_staff(
    establishment_id: UUID,
    staff_id: UUID,
    request: StaffUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> StaffResponse:
    """Update staff member."""
    establishment = await get_establishment_or_404(db, establishment_id)
    check_ownership(establishment, current_user)

    result = await db.execute(
        select(StaffMember).where(
            StaffMember.id == staff_id,
            StaffMember.establishment_id == establishment_id,
        )
    )
    staff = result.scalar_one_or_none()

    if not staff:
        raise NotFoundError("Funcionário")

    for field, value in request.model_dump(exclude_unset=True).items():
        setattr(staff, field, value)

    await db.commit()
    await db.refresh(staff)

    return StaffResponse(
        id=str(staff.id),
        name=staff.name,
        phone=staff.phone,
        role=staff.role,
        bio=staff.bio,
        contract_type=staff.contract_type.value,
        base_salary=float(staff.base_salary) if staff.base_salary else None,
        avatar_url=staff.avatar_url,
        work_schedule=staff.work_schedule,
        commission_rate=float(staff.commission_rate) if staff.commission_rate else None,
        user_id=str(staff.user_id) if staff.user_id else None,
        active=staff.active,
    )


@router.delete("/{staff_id}", status_code=204)
async def delete_staff(
    establishment_id: UUID,
    staff_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> None:
    """Delete staff member (soft delete)."""
    establishment = await get_establishment_or_404(db, establishment_id)
    check_ownership(establishment, current_user)

    result = await db.execute(
        select(StaffMember).where(
            StaffMember.id == staff_id,
            StaffMember.establishment_id == establishment_id,
        )
    )
    staff = result.scalar_one_or_none()

    if not staff:
        raise NotFoundError("Funcionário")

    staff.active = False
    await db.commit()


@router.post("/{staff_id}/blocks", response_model=StaffBlockResponse, status_code=201)
async def create_staff_block(
    establishment_id: UUID,
    staff_id: UUID,
    request: StaffBlockCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> StaffBlock:
    """Create a block period for a staff member."""
    establishment = await get_establishment_or_404(db, establishment_id)
    check_ownership(establishment, current_user)

    result = await db.execute(
        select(StaffMember).where(
            StaffMember.id == staff_id,
            StaffMember.establishment_id == establishment_id,
        )
    )
    staff = result.scalar_one_or_none()
    if not staff:
        raise NotFoundError("Funcionário")

    block = StaffBlock(
        staff_id=staff_id,
        start_at=request.start_at,
        end_at=request.end_at,
        reason=request.reason,
    )
    db.add(block)
    await db.commit()
    await db.refresh(block)
    return block


@router.get("/{staff_id}/blocks", response_model=list[StaffBlockResponse])
async def list_staff_blocks(
    establishment_id: UUID,
    staff_id: UUID,
    db: DBSession,
) -> list[StaffBlock]:
    """List blocks for a staff member."""
    result = await db.execute(select(StaffBlock).where(StaffBlock.staff_id == staff_id))
    return result.scalars().all()
