"""Admin moderation endpoints — reviews and queue overview."""

from uuid import UUID

from fastapi import APIRouter, Query
from pydantic import BaseModel
from sqlalchemy import desc, func, select
from sqlalchemy.orm import selectinload

from app.api.deps import AdminUser, DBSession
from app.models.establishment import Establishment, EstablishmentStatus
from app.models.queue import QueueStatus
from app.models.review import Review
from app.schemas.queue import QueueEntryResponse
from app.schemas.review import ReviewListResponse, ReviewResponse
from app.services.queue_service import QueueService

router = APIRouter(prefix="/admin", tags=["Admin Moderation"])


class AdminQueueOverviewItem(BaseModel):
    establishment_id: UUID
    establishment_name: str
    total_waiting: int
    current_serving: int
    items: list[QueueEntryResponse]


class AdminQueueOverviewResponse(BaseModel):
    establishments: list[AdminQueueOverviewItem]
    total_waiting: int


@router.get("/reviews", response_model=ReviewListResponse)
async def list_reviews_admin(
    db: DBSession,
    admin: AdminUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    establishment_id: UUID | None = None,
    min_rating: int | None = Query(None, ge=1, le=5),
) -> ReviewListResponse:
    """List reviews platform-wide for moderation."""
    query = (
        select(Review)
        .options(
            selectinload(Review.user),
            selectinload(Review.establishment),
            selectinload(Review.staff),
        )
        .order_by(desc(Review.created_at))
    )

    if establishment_id:
        query = query.where(Review.establishment_id == establishment_id)
    if min_rating is not None:
        query = query.where(Review.rating <= min_rating)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    result = await db.execute(query.offset((page - 1) * page_size).limit(page_size))
    reviews = result.scalars().all()

    items = []
    for r in reviews:
        item = ReviewResponse.model_validate(r)
        if r.user:
            item.user_name = r.user.name or "Anônimo"
        if r.establishment:
            item.establishment_name = r.establishment.name
        if r.staff:
            item.staff_name = r.staff.name
        items.append(item)

    return ReviewListResponse(items=items, total=total, page=page, page_size=page_size)


@router.patch("/reviews/{review_id}/hide", response_model=ReviewResponse)
async def hide_review_admin(
    review_id: UUID,
    db: DBSession,
    admin: AdminUser,
) -> ReviewResponse:
    """Hide review from public listings."""
    result = await db.execute(
        select(Review)
        .options(selectinload(Review.user), selectinload(Review.establishment), selectinload(Review.staff))
        .where(Review.id == review_id)
    )
    review = result.scalar_one_or_none()
    if not review:
        from app.core.exceptions import NotFoundError
        raise NotFoundError("Avaliação")
    review.is_hidden = True
    await db.commit()
    await db.refresh(review)
    item = ReviewResponse.model_validate(review)
    if review.user:
        item.user_name = review.user.name or "Anônimo"
    if review.establishment:
        item.establishment_name = review.establishment.name
    if review.staff:
        item.staff_name = review.staff.name
    return item


@router.patch("/reviews/{review_id}/unhide", response_model=ReviewResponse)
async def unhide_review_admin(
    review_id: UUID,
    db: DBSession,
    admin: AdminUser,
) -> ReviewResponse:
    """Restore hidden review to public."""
    result = await db.execute(
        select(Review)
        .options(selectinload(Review.user), selectinload(Review.establishment), selectinload(Review.staff))
        .where(Review.id == review_id)
    )
    review = result.scalar_one_or_none()
    if not review:
        from app.core.exceptions import NotFoundError
        raise NotFoundError("Avaliação")
    review.is_hidden = False
    await db.commit()
    await db.refresh(review)
    item = ReviewResponse.model_validate(review)
    if review.user:
        item.user_name = review.user.name or "Anônimo"
    if review.establishment:
        item.establishment_name = review.establishment.name
    if review.staff:
        item.staff_name = review.staff.name
    return item


@router.get("/queue", response_model=AdminQueueOverviewResponse)
async def list_queue_admin(
    db: DBSession,
    admin: AdminUser,
) -> AdminQueueOverviewResponse:
    """Active queues across all establishments."""
    est_result = await db.execute(
        select(Establishment).where(Establishment.status == EstablishmentStatus.active).order_by(Establishment.name)
    )
    establishments = est_result.scalars().all()

    service = QueueService(db)
    overview: list[AdminQueueOverviewItem] = []
    total_waiting = 0

    for est in establishments:
        entries = await service.list_by_establishment(est.id)
        if not entries:
            continue
        waiting = sum(1 for e in entries if e.status == QueueStatus.waiting)
        serving = sum(1 for e in entries if e.status == QueueStatus.serving)
        if waiting == 0 and serving == 0:
            continue
        total_waiting += waiting
        overview.append(
            AdminQueueOverviewItem(
                establishment_id=est.id,
                establishment_name=est.name,
                total_waiting=waiting,
                current_serving=serving,
                items=[
                    QueueEntryResponse(**service.entry_to_response(e, entries))
                    for e in entries
                ],
            )
        )

    return AdminQueueOverviewResponse(establishments=overview, total_waiting=total_waiting)
