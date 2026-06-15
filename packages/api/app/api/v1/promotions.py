"""Promotion endpoints (B110)."""

from uuid import UUID

from fastapi import APIRouter, status
from sqlalchemy import select

from app.api.deps import CurrentUser, DBSession
from app.core.exceptions import ForbiddenError, NotFoundError
from app.models import Establishment, UserRole
from app.schemas.promotion import PromotionCreate, PromotionResponse, PromotionUpdate
from app.services.promotion_service import PromotionService

router = APIRouter(
    prefix="/establishments/{establishment_id}/promotions",
    tags=["Promotions"],
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


@router.get("", response_model=list[PromotionResponse])
async def list_promotions(
    establishment_id: UUID,
    db: DBSession,
    active_only: bool = True,
) -> list[PromotionResponse]:
    """List promotions for an establishment (public active promos by default)."""
    await _get_establishment_or_404(db, establishment_id)
    service = PromotionService(db)
    promos = await service.list_for_establishment(establishment_id, active_only=active_only)
    return [PromotionResponse.model_validate(p) for p in promos]


@router.post("", response_model=PromotionResponse, status_code=status.HTTP_201_CREATED)
async def create_promotion(
    establishment_id: UUID,
    data: PromotionCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> PromotionResponse:
    """Create a promotion (owner/admin)."""
    establishment = await _get_establishment_or_404(db, establishment_id)
    _check_ownership(establishment, current_user)
    service = PromotionService(db)
    promo = await service.create(establishment_id, data)
    return PromotionResponse.model_validate(promo)


@router.patch("/{promotion_id}", response_model=PromotionResponse)
async def update_promotion(
    establishment_id: UUID,
    promotion_id: UUID,
    data: PromotionUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> PromotionResponse:
    """Update a promotion (owner/admin)."""
    establishment = await _get_establishment_or_404(db, establishment_id)
    _check_ownership(establishment, current_user)
    service = PromotionService(db)
    promo = await service.update(promotion_id, data)
    if not promo or promo.establishment_id != establishment_id:
        raise NotFoundError("Promoção")
    return PromotionResponse.model_validate(promo)


@router.post("/{promotion_id}/notify")
async def notify_promotion_favorites(
    establishment_id: UUID,
    promotion_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> dict:
    """Notify users who favorited the establishment (C112)."""
    from app.models.promotion import Promotion

    establishment = await _get_establishment_or_404(db, establishment_id)
    _check_ownership(establishment, current_user)
    promo_check = await db.execute(
        select(Promotion).where(
            Promotion.id == promotion_id,
            Promotion.establishment_id == establishment_id,
        )
    )
    if not promo_check.scalar_one_or_none():
        raise NotFoundError("Promoção")
    service = PromotionService(db)
    count = await service.notify_favorites(promotion_id)
    return {"notified": count}
