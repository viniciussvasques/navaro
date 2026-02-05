"""Establishment service."""

import re
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.establishment import Establishment, EstablishmentStatus
from app.models.user import User, UserRole
from app.schemas.establishment import (
    EstablishmentCreate,
    EstablishmentUpdate,
    EstablishmentResponse,
    EstablishmentListResponse,
    PaginationMeta,
)


class EstablishmentService:
    """Establishment service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, establishment_id: UUID) -> Establishment | None:
        """Get establishment by ID."""
        result = await self.db.execute(
            select(Establishment).where(Establishment.id == establishment_id)
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        q: Optional[str] = None,
        city: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> EstablishmentListResponse:
        """List establishments with filters."""
        query = select(Establishment).where(
            Establishment.status == EstablishmentStatus.ACTIVE
        )

        if q:
            query = query.where(Establishment.name.ilike(f"%{q}%"))
        if city:
            query = query.where(Establishment.city.ilike(f"%{city}%"))

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        # Paginate
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)

        result = await self.db.execute(query)
        establishments = result.scalars().all()

        return EstablishmentListResponse(
            data=[EstablishmentResponse.model_validate(e) for e in establishments],
            pagination=PaginationMeta(page=page, limit=limit, total=total),
        )

    async def create(
        self,
        owner_id: UUID,
        data: EstablishmentCreate,
    ) -> Establishment:
        """Create establishment."""
        # Generate slug
        slug = self._generate_slug(data.name)

        # Check if slug exists
        existing = await self.db.execute(
            select(Establishment).where(Establishment.slug == slug)
        )
        if existing.scalar_one_or_none():
            slug = f"{slug}-{str(owner_id)[:8]}"

        establishment = Establishment(
            owner_id=owner_id,
            slug=slug,
            **data.model_dump(),
        )
        self.db.add(establishment)

        # Update user role to owner
        user_result = await self.db.execute(select(User).where(User.id == owner_id))
        user = user_result.scalar_one_or_none()
        if user and user.role == UserRole.CUSTOMER:
            user.role = UserRole.OWNER

        await self.db.commit()
        await self.db.refresh(establishment)
        return establishment

    async def update(
        self,
        establishment_id: UUID,
        data: EstablishmentUpdate,
    ) -> Establishment | None:
        """Update establishment."""
        establishment = await self.get(establishment_id)
        if not establishment:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(establishment, field, value)

        await self.db.commit()
        await self.db.refresh(establishment)
        return establishment

    def _generate_slug(self, name: str) -> str:
        """Generate URL-friendly slug from name."""
        slug = name.lower()
        slug = re.sub(r"[^\w\s-]", "", slug)
        slug = re.sub(r"[\s_]+", "-", slug)
        slug = re.sub(r"-+", "-", slug)
        return slug.strip("-")
