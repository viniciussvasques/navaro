"""Portfolio service."""

from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.establishment import Establishment
from app.models.portfolio import PortfolioImage


class PortfolioService:
    """Portfolio service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def _verify_ownership(self, user_id: UUID, establishment_id: UUID) -> None:
        """Verify that the user owns the establishment."""
        result = await self.db.execute(
            select(Establishment).where(
                Establishment.id == establishment_id, Establishment.owner_id == user_id
            )
        )
        if not result.scalar_one_or_none():
            raise ForbiddenError("Você não tem permissão para gerenciar este estabelecimento.")

    async def add_image(self, user_id: UUID, data) -> PortfolioImage:
        """Add a new image to the portfolio."""
        await self._verify_ownership(user_id, data.establishment_id)

        image = PortfolioImage(
            establishment_id=data.establishment_id,
            staff_id=data.staff_id,
            image_url=data.image_url,
            thumbnail_url=data.thumbnail_url,
            description=data.description,
        )
        self.db.add(image)
        await self.db.commit()
        await self.db.refresh(image)
        return image

    async def remove_image(self, user_id: UUID, image_id: UUID) -> None:
        """Remove an image from the portfolio."""
        result = await self.db.execute(select(PortfolioImage).where(PortfolioImage.id == image_id))
        image = result.scalar_one_or_none()
        if not image:
            raise NotFoundError("Imagem")

        await self._verify_ownership(user_id, image.establishment_id)

        await self.db.delete(image)
        await self.db.commit()

    async def list_by_establishment(
        self, establishment_id: UUID, skip: int = 0, limit: int = 20
    ) -> tuple[Sequence[PortfolioImage], int]:
        """List images for an establishment."""
        query = (
            select(PortfolioImage)
            .where(PortfolioImage.establishment_id == establishment_id)
            .order_by(PortfolioImage.created_at.desc())
        )

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Paginate
        result = await self.db.execute(query.offset(skip).limit(limit))
        return result.scalars().all(), total

    async def list_by_staff(
        self, staff_id: UUID, skip: int = 0, limit: int = 20
    ) -> tuple[Sequence[PortfolioImage], int]:
        """List images for a specific staff member."""
        query = (
            select(PortfolioImage)
            .where(PortfolioImage.staff_id == staff_id)
            .order_by(PortfolioImage.created_at.desc())
        )

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Paginate
        result = await self.db.execute(query.offset(skip).limit(limit))
        return result.scalars().all(), total
