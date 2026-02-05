"""Subscription Plan endpoints."""

from uuid import UUID

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.exceptions import ForbiddenError, NotFoundError
from app.models import Establishment, SubscriptionPlan, SubscriptionPlanItem, UserRole
from app.schemas.service import (
    SubscriptionPlanCreate,
    SubscriptionPlanResponse,
    SubscriptionPlanUpdate,
)

router = APIRouter(
    prefix="/establishments/{establishment_id}/subscription-plans", tags=["Subscription Plans"]
)


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


@router.get("", response_model=list[SubscriptionPlanResponse])
async def list_plans(
    establishment_id: UUID,
    db: DBSession,
    active_only: bool = True,
) -> list[SubscriptionPlanResponse]:
    """List subscription plans for an establishment."""
    query = select(SubscriptionPlan).where(SubscriptionPlan.establishment_id == establishment_id)

    if active_only:
        query = query.where(SubscriptionPlan.active == True)

    result = await db.execute(query)
    plans = result.scalars().all()

    return [SubscriptionPlanResponse.model_validate(p) for p in plans]


@router.post("", response_model=SubscriptionPlanResponse, status_code=201)
async def create_plan(
    establishment_id: UUID,
    request: SubscriptionPlanCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> SubscriptionPlanResponse:
    """Create new subscription plan."""
    establishment = await get_establishment_or_404(db, establishment_id)
    check_ownership(establishment, current_user)

    plan = SubscriptionPlan(
        establishment_id=establishment_id,
        name=request.name,
        description=request.description,
        price=request.price,
    )

    db.add(plan)
    await db.flush()

    for item in request.items:
        plan_item = SubscriptionPlanItem(
            plan_id=plan.id,
            service_id=item.service_id,
            bundle_id=item.bundle_id,
            quantity_per_month=item.quantity_per_month,
        )
        db.add(plan_item)

    await db.commit()
    await db.refresh(plan)

    return SubscriptionPlanResponse.model_validate(plan)


@router.patch("/{plan_id}", response_model=SubscriptionPlanResponse)
async def update_plan(
    establishment_id: UUID,
    plan_id: UUID,
    request: SubscriptionPlanUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> SubscriptionPlanResponse:
    """Update subscription plan."""
    establishment = await get_establishment_or_404(db, establishment_id)
    check_ownership(establishment, current_user)

    result = await db.execute(
        select(SubscriptionPlan).where(
            SubscriptionPlan.id == plan_id, SubscriptionPlan.establishment_id == establishment_id
        )
    )
    plan = result.scalar_one_or_none()

    if not plan:
        raise NotFoundError("Plano")

    for field, value in request.model_dump(exclude_unset=True).items():
        setattr(plan, field, value)

    await db.commit()
    await db.refresh(plan)

    return SubscriptionPlanResponse.model_validate(plan)
