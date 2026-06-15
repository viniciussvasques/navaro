"""Payments endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.database import get_db
from app.dependencies import get_current_user, verify_establishment_owner
from app.models.user import User
from app.schemas.payment import (
    CreatePaymentIntentRequest,
    CreatePaymentIntentResponse,
    PaymentConfigResponse,
    PaymentResponse,
    PlanPayIntentRequest,
    TipPayIntentRequest,
    WalletResponse,
    WalletTransactionResponse,
)
from app.services.payment_service import PaymentService

router = APIRouter()


@router.get("/config", response_model=PaymentConfigResponse)
async def get_payment_config(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PaymentConfigResponse:
    """Payment methods enabled on the platform (Mercado Pago, Stripe)."""
    service = PaymentService(db)
    config = await service.get_payment_config()
    return PaymentConfigResponse(**config)


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
    await verify_establishment_owner(db, establishment_id, current_user)

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


@router.post("/create-checkout")
async def create_checkout(
    data: CreatePaymentIntentRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """
    Create Mercado Pago Checkout Pro (supports card, PIX, boleto).
    Returns a checkout URL to open in the user's browser.
    """
    service = PaymentService(db)
    try:
        return await service.create_checkout(current_user.id, data.appointment_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/status/{payment_id}")
async def check_payment_status(
    payment_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Check payment status (for PIX polling)."""
    from sqlalchemy import select

    from app.models.payment import Payment, PaymentStatus, Tip

    # Tips (Mercado Pago)
    tip_result = await db.execute(
        select(Tip).where(
            Tip.provider_payment_id == payment_id,
            Tip.user_id == current_user.id,
        )
    )
    tip = tip_result.scalar_one_or_none()
    if tip:
        if tip.status == PaymentStatus.succeeded:
            return {"status": "succeeded", "type": "tip"}
        if tip.status == PaymentStatus.failed:
            return {"status": "failed", "type": "tip"}
        # Poll Mercado Pago
        if tip.provider == "mercadopago":
            try:
                from app.models.system_settings import SettingsKeys
                from app.services.payment_providers.mercadopago_p import MercadoPagoProvider
                from app.services.settings_service import SettingsService

                token = await SettingsService(db).get(SettingsKeys.MERCADOPAGO_ACCESS_TOKEN) or ""
                if token:
                    mp = MercadoPagoProvider(access_token=token)
                    mp_status = await mp.get_payment_status(payment_id)
                    if mp_status["status"] == "approved":
                        service = PaymentService(db)
                        await service.handle_webhook(
                            "mercadopago",
                            {"action": "payment.updated", "data": {"id": payment_id}},
                        )
                        return {"status": "succeeded", "type": "tip"}
                    if mp_status["status"] in ("rejected", "cancelled"):
                        tip.status = PaymentStatus.failed
                        await db.commit()
                        return {"status": "failed", "type": "tip"}
            except Exception:
                pass
        return {"status": "pending", "type": "tip"}

    # Regular payments
    result = await db.execute(
        select(Payment).where(
            Payment.provider_payment_id == payment_id,
            Payment.user_id == current_user.id,
        )
    )
    payment = result.scalar_one_or_none()

    if not payment:
        raise HTTPException(status_code=404, detail="Pagamento nao encontrado")

    # If still pending AND provider is mercadopago, check directly
    if payment.status == PaymentStatus.pending and payment.provider == "mercadopago":
        try:
            from app.models.system_settings import SettingsKeys
            from app.services.payment_providers.mercadopago_p import MercadoPagoProvider
            from app.services.settings_service import SettingsService

            token = await SettingsService(db).get(SettingsKeys.MERCADOPAGO_ACCESS_TOKEN) or ""
            if token:
                mp = MercadoPagoProvider(access_token=token)
                mp_status = await mp.get_payment_status(payment_id)

                if mp_status["status"] == "approved":
                    # Update local records
                    service = PaymentService(db)
                    await service.handle_webhook(
                        "mercadopago",
                        {"action": "payment.updated", "data": {"id": payment_id}},
                    )
                    return {"status": "succeeded", "provider_status": "approved"}
                elif mp_status["status"] in ("rejected", "cancelled"):
                    payment.status = PaymentStatus.failed
                    await db.commit()
                    return {"status": "failed", "provider_status": mp_status["status"]}
                else:
                    return {
                        "status": "pending",
                        "provider_status": mp_status["status"],
                    }
        except ValueError:
            # Checkout Pro stores preference_id — search by appointment external_reference
            if payment.appointment_id:
                try:
                    from app.models.system_settings import SettingsKeys
                    from app.services.payment_providers.mercadopago_p import MercadoPagoProvider
                    from app.services.settings_service import SettingsService

                    token = await SettingsService(db).get(SettingsKeys.MERCADOPAGO_ACCESS_TOKEN) or ""
                    if token:
                        mp = MercadoPagoProvider(access_token=token)
                        approved = await mp.search_approved_by_external_reference(
                            str(payment.appointment_id)
                        )
                        if approved:
                            service = PaymentService(db)
                            await service.handle_webhook(
                                "mercadopago",
                                {"action": "payment.updated", "data": {"id": approved["id"]}},
                            )
                            return {"status": "succeeded", "provider_status": "approved"}
                except Exception:
                    pass
        except Exception:
            pass

    return {
        "status": payment.status.value,
        "provider_status": payment.status.value,
    }


@router.post("/pay-wallet")
async def pay_with_wallet(
    data: CreatePaymentIntentRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Pay for appointment using wallet balance."""
    service = PaymentService(db)
    try:
        await service.pay_with_wallet(current_user.id, data.appointment_id)
        return {"status": "succeeded", "message": "Pagamento realizado com sucesso via carteira."}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "WALLET_ERROR", "message": str(e)},
        )


@router.post("/webhooks/mercadopago")
@router.get("/webhooks/mercadopago")
async def mercadopago_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, str]:
    """Handle Mercado Pago webhooks (POST JSON or GET IPN)."""
    from app.models.system_settings import SettingsKeys
    from app.services.payment_providers.mercadopago_p import verify_mercadopago_webhook_signature
    from app.services.settings_service import SettingsService

    if request.method == "GET":
        payment_id = request.query_params.get("data.id") or request.query_params.get("id")
        if not payment_id:
            return {"status": "ignored"}
        data = {"action": "payment.updated", "data": {"id": payment_id}}
    else:
        try:
            data = await request.json()
        except Exception:
            return {"status": "invalid"}
        payment_id = str(data.get("data", {}).get("id", ""))

    settings_svc = SettingsService(db)
    webhook_secret = await settings_svc.get(SettingsKeys.MERCADOPAGO_WEBHOOK_SECRET) or ""
    if webhook_secret:
        x_signature = request.headers.get("x-signature")
        x_request_id = request.headers.get("x-request-id")
        data_id = payment_id or str(data.get("data", {}).get("id", ""))
        if not verify_mercadopago_webhook_signature(
            x_signature, x_request_id, data_id, webhook_secret
        ):
            raise HTTPException(status_code=401, detail="Assinatura do webhook inválida")

    service = PaymentService(db)
    await service.handle_webhook("mercadopago", data)

    return {"status": "success"}


@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, str]:
    """Handle Stripe webhooks. Webhook secret from admin (dynamic config) or env."""
    import stripe

    from app.models.system_settings import SettingsKeys
    from app.services.settings_service import SettingsService

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = (await SettingsService(db).get(SettingsKeys.STRIPE_WEBHOOK_SECRET)) or getattr(
        settings, "STRIPE_WEBHOOK_SECRET", ""
    )

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
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
