"""Payout endpoints."""

from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, verify_establishment_access
from app.models.user import User
from app.services.payout_service import PayoutService

router = APIRouter()


class PayoutRequest(BaseModel):
    amount: float


class PayoutResponse(BaseModel):
    id: UUID
    establishment_id: UUID
    amount: float
    status: str
    created_at: Any  # Placeholder for simplicity in this artifact

    model_config = {"from_attributes": True}


@router.get("/establishments/{establishment_id}/balance")
async def get_balance(
    establishment_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get establishment's withdrawable balance."""
    await verify_establishment_access(db, establishment_id, current_user)
    service = PayoutService(db)
    balance = await service.get_withdrawable_balance(establishment_id)
    return {"available_balance": balance}


@router.post("/establishments/{establishment_id}/requests")
async def request_payout(
    establishment_id: UUID,
    data: PayoutRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Request a payout."""
    await verify_establishment_access(db, establishment_id, current_user)
    service = PayoutService(db)
    try:
        payout = await service.request_payout(establishment_id, data.amount)
        return payout
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/establishments/{establishment_id}/history")
async def list_payouts(
    establishment_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """List payout history for an establishment."""
    await verify_establishment_access(db, establishment_id, current_user)
    service = PayoutService(db)
    return await service.list_payouts(establishment_id)
