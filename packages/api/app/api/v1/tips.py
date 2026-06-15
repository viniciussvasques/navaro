"""Tips endpoints."""

from collections.abc import Sequence

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select

from app.api.deps import DBSession, get_current_user
from app.core.exceptions import BusinessError
from app.models.appointment import Appointment
from app.models.payment import PaymentStatus, Tip
from app.models.staff import StaffMember
from app.models.user import User
from app.models.wallet import TransactionType
from app.schemas.payment import CreatePaymentIntentResponse, TipCreate, TipPayIntentRequest, TipResponse
from app.services.payment_service import PaymentService
from app.services.wallet_service import WalletService

router = APIRouter(prefix="/tips", tags=["Tips"])


@router.post("/pay-intent", response_model=CreatePaymentIntentResponse)
async def create_tip_pay_intent(
    request: TipPayIntentRequest,
    db: DBSession,
    current_user: User = Depends(get_current_user),
) -> CreatePaymentIntentResponse:
    """Create Mercado Pago PIX intent for a tip (completes on webhook)."""
    staff_result = await db.execute(select(StaffMember).where(StaffMember.id == request.staff_id))
    staff = staff_result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Profissional não encontrado")

    if request.appointment_id:
        appt_result = await db.execute(
            select(Appointment).where(
                Appointment.id == request.appointment_id,
                Appointment.user_id == current_user.id,
            )
        )
        if not appt_result.scalar_one_or_none():
            raise HTTPException(
                status_code=404, detail="Agendamento não encontrado ou não pertence ao usuário"
            )

    payment_svc = PaymentService(db)
    settings_svc, _, mp_token, base_url = await payment_svc._load_payment_settings()
    mp_token = await payment_svc._assert_mercadopago_enabled(settings_svc)

    from app.services.payment_providers.factory import PaymentProviderFactory

    provider = PaymentProviderFactory.get_provider("mercadopago", mercadopago_access_token=mp_token)
    payer_email = current_user.email or "cliente@dunnaa.com.br"
    webhook_url = f"{base_url}/api/v1/payments/webhooks/mercadopago"

    tip = Tip(
        user_id=current_user.id,
        staff_id=request.staff_id,
        establishment_id=staff.establishment_id,
        appointment_id=request.appointment_id,
        amount=request.amount,
        status=PaymentStatus.pending,
        provider="mercadopago",
    )
    db.add(tip)
    await db.flush()

    intent_data = await provider.create_intent(
        user_id=current_user.id,
        amount=request.amount,
        metadata={
            "purpose": "tip",
            "tip_id": str(tip.id),
            "staff_id": str(request.staff_id),
            "establishment_id": str(staff.establishment_id),
            "establishment_name": staff.name or "Profissional",
            "payer_email": payer_email,
            "webhook_url": webhook_url,
        },
    )

    tip.provider_payment_id = intent_data["provider_payment_id"]
    await db.commit()

    return CreatePaymentIntentResponse(
        amount=request.amount,
        provider="mercadopago",
        provider_payment_id=intent_data["provider_payment_id"],
        qr_code=intent_data.get("qr_code"),
        qr_code_base64=intent_data.get("qr_code_base64"),
        ticket_url=intent_data.get("ticket_url"),
    )


@router.post("/", response_model=TipResponse)
async def create_tip(
    request: TipCreate,
    db: DBSession,
    current_user: User = Depends(get_current_user),
) -> Tip:
    """Give a tip to a staff member (wallet or Mercado Pago via /pay-intent)."""
    if request.payment_method == "mercadopago":
        raise BusinessError(
            "USE_PAY_INTENT",
            "Use POST /tips/pay-intent para pagar gorjeta via Mercado Pago",
        )

    staff_result = await db.execute(select(StaffMember).where(StaffMember.id == request.staff_id))
    staff = staff_result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Profissional não encontrado")

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

    tip_status = PaymentStatus.pending
    if request.payment_method == "wallet":
        wallet = WalletService(db)
        try:
            await wallet.withdraw_balance(
                user_id=current_user.id,
                amount=request.amount,
                description=f"Gorjeta para {staff.name}",
                reference_id=str(request.staff_id),
            )
        except ValueError as e:
            raise BusinessError("INSUFFICIENT_BALANCE", str(e)) from e
        if staff.user_id:
            await wallet.add_balance(
                user_id=staff.user_id,
                amount=request.amount,
                description="Gorjeta recebida de cliente",
                reference_id=str(current_user.id),
                tx_type=TransactionType.deposit,
            )
        tip_status = PaymentStatus.succeeded
    elif request.payment_method == "stripe":
        raise BusinessError("NOT_IMPLEMENTED", "Gorjeta via Stripe ainda não configurada")
    else:
        raise BusinessError("INVALID_PAYMENT_METHOD", "Método de pagamento inválido")

    tip = Tip(
        user_id=current_user.id,
        staff_id=request.staff_id,
        establishment_id=staff.establishment_id,
        appointment_id=request.appointment_id,
        amount=request.amount,
        status=tip_status,
        provider=request.payment_method,
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
