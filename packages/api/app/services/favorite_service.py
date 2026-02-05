"""Favorite service."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.review import Favorite, FavoriteStaff


class FavoriteService:
    """Favorite service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def toggle_establishment(self, user_id: UUID, establishment_id: UUID) -> bool:
        """
        Toggle favorite status for an establishment.
        Returns True if added, False if removed.
        """
        result = await self.db.execute(
            select(Favorite).where(
                Favorite.user_id == user_id, Favorite.establishment_id == establishment_id
            )
        )
        favorite = result.scalar_one_or_none()

        if favorite:
            await self.db.delete(favorite)
            await self.db.commit()
            return False

        favorite = Favorite(user_id=user_id, establishment_id=establishment_id)
        self.db.add(favorite)
        await self.db.commit()
        return True

    async def toggle_staff(self, user_id: UUID, staff_id: UUID, establishment_id: UUID) -> bool:
        """
        Toggle favorite status for a staff member.
        Returns True if added, False if removed.
        """
        result = await self.db.execute(
            select(FavoriteStaff).where(
                FavoriteStaff.user_id == user_id, FavoriteStaff.staff_id == staff_id
            )
        )
        favorite = result.scalar_one_or_none()

        if favorite:
            await self.db.delete(favorite)
            await self.db.commit()
            return False

        favorite = FavoriteStaff(
            user_id=user_id, staff_id=staff_id, establishment_id=establishment_id
        )
        self.db.add(favorite)
        await self.db.commit()
        return True

    async def list_user_favorites(self, user_id: UUID):
        """List all user favorites (Establishments and Staff)."""
        # Load favorite establishments
        est_result = await self.db.execute(
            select(Favorite)
            .where(Favorite.user_id == user_id)
            .options(selectinload(Favorite.establishment))
        )
        favorites_est = est_result.scalars().all()

        # Load favorite staff
        staff_result = await self.db.execute(
            select(FavoriteStaff)
            .where(FavoriteStaff.user_id == user_id)
            .options(selectinload(FavoriteStaff.staff), selectinload(FavoriteStaff.establishment))
        )
        favorites_staff = staff_result.scalars().all()

        return favorites_est, favorites_staff
