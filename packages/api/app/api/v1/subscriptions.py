"""Subscriptions endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, verify_establishment_owner
from app.models.user import User
from app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionResponse,
    SubscriptionPlanCreate,
    SubscriptionPlanResponse,
)
from app.services.subscription_service import SubscriptionService

router = APIRouter()


# ==================== PLANS ====================

@router.get(
    "/establishments/{establishment_id}/plans",
    response_model=list[SubscriptionPlanResponse],
)
async def list_plans(
    establishment_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[SubscriptionPlanResponse]:
    """List subscription plans of an establishment."""
    service = SubscriptionService(db)
    plans = await service.list_plans(establishment_id)
    return [SubscriptionPlanResponse.model_validate(p) for p in plans]


@router.post(
    "/establishments/{establishment_id}/plans",
    response_model=SubscriptionPlanResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_plan(
    establishment_id: UUID,
    data: SubscriptionPlanCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SubscriptionPlanResponse:
    """Create subscription plan."""
    await verify_establishment_owner(db, establishment_id, current_user.id)
    
    service = SubscriptionService(db)
    plan = await service.create_plan(establishment_id, data)
    return SubscriptionPlanResponse.model_validate(plan)


# ==================== SUBSCRIPTIONS ====================

@router.get("", response_model=list[SubscriptionResponse])
async def list_user_subscriptions(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[SubscriptionResponse]:
    """List current user's active subscriptions."""
    service = SubscriptionService(db)
    subscriptions = await service.list_by_user(current_user.id)
    return [SubscriptionResponse.model_validate(s) for s in subscriptions]


@router.get(
    "/establishments/{establishment_id}",
    response_model=list[SubscriptionResponse],
)
async def list_establishment_subscriptions(
    establishment_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[SubscriptionResponse]:
    """List establishment's subscribers (owner only)."""
    await verify_establishment_owner(db, establishment_id, current_user.id)
    
    service = SubscriptionService(db)
    subscriptions = await service.list_by_establishment(establishment_id)
    return [SubscriptionResponse.model_validate(s) for s in subscriptions]


@router.post("", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
async def create_subscription(
    data: SubscriptionCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SubscriptionResponse:
    """Subscribe to a plan."""
    service = SubscriptionService(db)
    
    try:
        subscription = await service.create(current_user.id, data)
        return SubscriptionResponse.model_validate(subscription)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "SUBSCRIPTION_ERROR", "message": str(e)},
        )


@router.delete("/{subscription_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_subscription(
    subscription_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Cancel subscription."""
    service = SubscriptionService(db)
    await service.cancel(subscription_id, current_user.id)
