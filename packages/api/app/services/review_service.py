"""Review service."""

from collections.abc import Sequence
from datetime import datetime
from uuid import UUID

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.appointment import Appointment
from app.models.review import Review
from app.schemas.review import ReviewCreate, ReviewUpdate


class ReviewService:
    """Review service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, user_id: UUID, data: ReviewCreate) -> Review:
        """Create a new review."""
        # Clean up optional fields if they are UUID strings or None
        # Pydantic handles basic UUID, but logic check is good

        # If appointment_id is provided, verify it belongs to user
        if data.appointment_id:
            result = await self.db.execute(
                select(Appointment).where(
                    Appointment.id == data.appointment_id, Appointment.user_id == user_id
                )
            )
            appointment = result.scalar_one_or_none()
            if not appointment:
                raise ValueError("Agendamento não encontrado ou não pertence a você.")

            # Check if already reviewed? (Unique constraint handles it at DB level,
            # but nicer to check here)
            # appointment.review would be loaded if related

        review = Review(
            user_id=user_id,
            establishment_id=data.establishment_id,
            appointment_id=data.appointment_id,
            staff_id=data.staff_id,
            rating=data.rating,
            comment=data.comment,
            created_at=datetime.now(),
        )

        self.db.add(review)
        await self.db.commit()
        await self.db.refresh(review)
        return review

    async def update(self, user_id: UUID, review_id: UUID, data: ReviewUpdate) -> Review | None:
        """Update a review."""
        result = await self.db.execute(
            select(Review).where(Review.id == review_id, Review.user_id == user_id)
        )
        review = result.scalar_one_or_none()

        if not review:
            return None

        if data.rating is not None:
            review.rating = data.rating
        if data.comment is not None:
            review.comment = data.comment

        review.updated_at = datetime.now()

        await self.db.commit()
        await self.db.refresh(review)
        return review

    async def respond(self, review_id: UUID, response: str) -> Review | None:
        """Add owner response to a review."""
        result = await self.db.execute(select(Review).where(Review.id == review_id))
        review = result.scalar_one_or_none()

        if not review:
            return None

        review.owner_response = response
        review.owner_responded_at = datetime.now()

        await self.db.commit()
        await self.db.refresh(review)
        return review

    async def list_by_establishment(
        self, establishment_id: UUID, page: int = 1, page_size: int = 20
    ) -> tuple[Sequence[Review], int]:
        """List reviews for an establishment."""
        query = (
            select(Review)
            .where(Review.establishment_id == establishment_id)
            .options(selectinload(Review.user))
            .order_by(desc(Review.created_at))
        )

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Paginate
        query = query.offset((page - 1) * page_size).limit(page_size)
        result = await self.db.execute(query)
        reviews = result.scalars().all()

        return reviews, total

    async def list_by_user(self, user_id: UUID) -> Sequence[Review]:
        """List reviews made by a user."""
        query = select(Review).where(Review.user_id == user_id).order_by(desc(Review.created_at))

        result = await self.db.execute(query)
        return result.scalars().all()
