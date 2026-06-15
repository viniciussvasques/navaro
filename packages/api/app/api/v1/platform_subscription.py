"""Platform SaaS subscription endpoints for establishments."""

from uuid import UUID

from fastapi import APIRouter, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.exceptions import BusinessError, ForbiddenError, NotFoundError
from app.models import Establishment, UserRole
from app.schemas.promotion import (
    MonetizationSummaryResponse,
    PlatformAutoRenewUpdate,
    PlatformSaasPayIntentRequest,
    PlatformSubscriptionPayResponse,
)
from app.schemas.payment import CreatePaymentIntentResponse
from app.services.monetization_service import MonetizationService
from app.services.payment_service import PaymentService

router = APIRouter(
    prefix="/establishments/{establishment_id}/platform-subscription",
    tags=["Platform Subscription"],
)


async def _get_establishment_or_404(db: DBSession, establishment_id: UUID) -> Establishment:
    result = await db.execute(select(Establishment).where(Establishment.id == establishment_id))
    establishment = result.scalar_one_or_none()
    if not establishment:
        raise NotFoundError("Estabelecimento")
    return establishment


def _check_ownership(establishment: Establishment, user: CurrentUser) -> None:
    if establishment.owner_id != user.id and user.role != UserRole.admin:
        raise ForbiddenError()


@router.get("", response_model=MonetizationSummaryResponse)
async def get_platform_subscription(
    establishment_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> MonetizationSummaryResponse:
    """Status da assinatura SaaS da plataforma (dono/admin)."""
    establishment = await _get_establishment_or_404(db, establishment_id)
    _check_ownership(establishment, current_user)
    service = MonetizationService(db)
    summary = await service.get_tier_summary(establishment_id)
    return MonetizationSummaryResponse(**summary)


@router.post("/pay", response_model=PlatformSubscriptionPayResponse, status_code=status.HTTP_200_OK)
async def pay_platform_subscription(
    establishment_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> PlatformSubscriptionPayResponse:
    """Pagar assinatura mensal da plataforma via wallet do dono."""
    establishment = await _get_establishment_or_404(db, establishment_id)
    _check_ownership(establishment, current_user)
    service = MonetizationService(db)
    try:
        result = await service.pay_platform_subscription(establishment_id, current_user.id)
    except ValueError as e:
        raise BusinessError("WALLET_ERROR", str(e)) from e
    return PlatformSubscriptionPayResponse(**result)


@router.post("/pay-intent", response_model=CreatePaymentIntentResponse)
async def pay_platform_subscription_intent(
    establishment_id: UUID,
    data: PlatformSaasPayIntentRequest,
    db: DBSession,
    current_user: CurrentUser,
) -> CreatePaymentIntentResponse:
    """Pagar assinatura SaaS via Stripe ou Mercado Pago."""
    establishment = await _get_establishment_or_404(db, establishment_id)
    _check_ownership(establishment, current_user)
    payment_svc = PaymentService(db)
    try:
        result = await payment_svc.create_saas_payment_intent(
            current_user.id, establishment_id, data.provider
        )
        return CreatePaymentIntentResponse(**result)
    except ValueError as e:
        raise BusinessError("PAYMENT_ERROR", str(e)) from e


@router.patch("/auto-renew")
async def update_platform_auto_renew(
    establishment_id: UUID,
    data: PlatformAutoRenewUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> dict:
    """Ativar/desativar renovação automática via wallet."""
    establishment = await _get_establishment_or_404(db, establishment_id)
    _check_ownership(establishment, current_user)
    service = MonetizationService(db)
    return await service.set_auto_renew(establishment_id, current_user.id, data.enabled)
