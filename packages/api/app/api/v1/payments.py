"""Payments endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, verify_establishment_owner
from app.models.user import User
from app.schemas.payment import (
    CreatePaymentIntentRequest,
    CreatePaymentIntentResponse,
    PaymentResponse,
)
from app.services.payment_service import PaymentService
from app.config import settings

router = APIRouter()


@router.get("", response_model=list[PaymentResponse])
async def list_user_payments(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[PaymentResponse]:
    """List current user's payments."""
    service = PaymentService(db)
    payments = await service.list_by_user(current_user.id)
    return [PaymentResponse.model_validate(p) for p in payments]


@router.get("/establishments/{establishment_id}", response_model=list[PaymentResponse])
async def list_establishment_payments(
    establishment_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[PaymentResponse]:
    """List establishment payments (owner only)."""
    await verify_establishment_owner(db, establishment_id, current_user.id)
    
    service = PaymentService(db)
    payments = await service.list_by_establishment(establishment_id)
    return [PaymentResponse.model_validate(p) for p in payments]


@router.post("/create-intent", response_model=CreatePaymentIntentResponse)
async def create_payment_intent(
    data: CreatePaymentIntentRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CreatePaymentIntentResponse:
    """Create Stripe payment intent for single appointment."""
    service = PaymentService(db)
    
    try:
        result = await service.create_payment_intent(current_user.id, data.appointment_id)
        return CreatePaymentIntentResponse(**result)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "PAYMENT_ERROR", "message": str(e)},
        )


@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, str]:
    """Handle Stripe webhooks."""
    import stripe
    
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    service = PaymentService(db)
    await service.handle_webhook(event)
    
    return {"status": "success"}
