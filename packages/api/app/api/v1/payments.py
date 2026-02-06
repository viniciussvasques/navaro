"""Payments endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.database import get_db
from app.dependencies import get_current_user, verify_establishment_access
from app.models.user import User
from app.schemas.payment import (
    CreatePaymentIntentRequest,
    CreatePaymentIntentResponse,
    PaymentResponse,
    WalletResponse,
    WalletTransactionResponse,
)
from app.services.payment_service import PaymentService

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
    await verify_establishment_access(db, establishment_id, current_user)

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
        result = await service.create_payment_intent(
            user_id=current_user.id, appointment_id=data.appointment_id, provider_name=data.provider
        )
        return CreatePaymentIntentResponse(**result)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "PAYMENT_ERROR", "message": str(e)},
        )


@router.post("/webhooks/mercadopago")
async def mercadopago_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, str]:
    """Handle Mercado Pago webhooks."""
    data = await request.json()

    # In MP, we usually need to fetch the payment details from the API
    # but the PaymentService.handle_webhook should encapsulate that logic.
    service = PaymentService(db)
    await service.handle_webhook("mercadopago", data)

    return {"status": "success"}


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
        event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    service = PaymentService(db)
    await service.handle_webhook("stripe", event)

    return {"status": "success"}


@router.get("/wallet", response_model=WalletResponse)
async def get_my_wallet(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> WalletResponse:
    """Get current user's wallet and balance."""
    from app.services.wallet_service import WalletService

    service = WalletService(db)
    wallet = await service.get_wallet(current_user.id)
    return WalletResponse.model_validate(wallet)


@router.get("/wallet/transactions", response_model=list[WalletTransactionResponse])
async def list_wallet_transactions(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[WalletTransactionResponse]:
    """List wallet transactions."""
    from app.services.wallet_service import WalletService

    service = WalletService(db)
    transactions = await service.get_transactions(current_user.id)
    return [WalletTransactionResponse.model_validate(t) for t in transactions]
