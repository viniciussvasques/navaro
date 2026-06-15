"""Customer subscription endpoints."""

from uuid import UUID

from fastapi import APIRouter, status

from app.api.deps import CurrentUser, DBSession
from app.core.exceptions import BusinessError, NotFoundError
from app.schemas.payment import CreatePaymentIntentResponse
from app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionResponse,
    SubscriptionUsageResponse,
)
from app.schemas.payment import PlanPayIntentRequest
from app.services.subscription_service import SubscriptionService
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


def _to_response(sub, usage: SubscriptionUsageResponse | None = None) -> SubscriptionResponse:
    from app.schemas.subscription import SubscriptionPlanResponse

    plan_resp = SubscriptionPlanResponse.model_validate(sub.plan) if sub.plan else None
    return SubscriptionResponse(
        id=sub.id,
        user_id=sub.user_id,
        plan_id=sub.plan_id,
        establishment_id=sub.establishment_id,
        status=sub.status,
        current_period_start=sub.current_period_start,
        current_period_end=sub.current_period_end,
        created_at=sub.created_at,
        cancelled_at=sub.cancelled_at,
        plan=plan_resp,
        usage=usage,
    )


@router.get("", response_model=list[SubscriptionResponse])
async def list_my_subscriptions(
    db: DBSession,
    current_user: CurrentUser,
) -> list[SubscriptionResponse]:
    """List current user's subscriptions (C52 usage included)."""
    service = SubscriptionService(db)
    subs = await service.list_user_subscriptions(current_user.id)
    responses = []
    for sub in subs:
        usage = await service._usage_for_subscription(sub)
        responses.append(_to_response(sub, usage))
    return responses


@router.post("/pay-intent", response_model=CreatePaymentIntentResponse)
async def subscribe_pay_intent(
    data: PlanPayIntentRequest,
    db: DBSession,
    current_user: CurrentUser,
) -> CreatePaymentIntentResponse:
    """Generate Mercado Pago PIX for a subscription plan."""
    payment_svc = PaymentService(db)
    try:
        result = await payment_svc.create_subscription_payment_intent(
            current_user.id, data.plan_id, data.provider
        )
        return CreatePaymentIntentResponse(**result)
    except ValueError as e:
        raise BusinessError("PAYMENT_ERROR", str(e)) from e


@router.get("/{subscription_id}", response_model=SubscriptionResponse)
async def get_my_subscription(
    subscription_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> SubscriptionResponse:
    """Get one subscription with usage."""
    service = SubscriptionService(db)
    sub = await service.get_user_subscription(current_user.id, subscription_id)
    if not sub:
        raise NotFoundError("Assinatura")
    usage = await service._usage_for_subscription(sub)
    return _to_response(sub, usage)


@router.post("", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
async def subscribe_to_plan(
    data: SubscriptionCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> SubscriptionResponse:
    """Subscribe to a plan (C51). Default payment: wallet."""
    service = SubscriptionService(db)
    try:
        sub = await service.subscribe(
            current_user.id,
            data.plan_id,
            payment_method=data.payment_method,
            payment_method_id=data.payment_method_id,
        )
    except BusinessError:
        raise
    usage = await service._usage_for_subscription(sub)
    return _to_response(sub, usage)


@router.delete("/{subscription_id}", response_model=SubscriptionResponse)
async def cancel_subscription(
    subscription_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> SubscriptionResponse:
    """Cancel subscription (C53)."""
    service = SubscriptionService(db)
    try:
        sub = await service.cancel(current_user.id, subscription_id)
    except BusinessError:
        raise
    usage = await service._usage_for_subscription(sub)
    return _to_response(sub, usage)
