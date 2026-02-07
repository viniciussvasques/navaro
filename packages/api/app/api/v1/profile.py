"""Establishment Profile endpoint."""

from uuid import UUID

from fastapi import APIRouter
from sqlalchemy import desc, func, select
from sqlalchemy.orm import selectinload

from app.api.deps import DBSession
from app.core.exceptions import NotFoundError
from app.models import Establishment, PortfolioImage, Review, Service, StaffMember, EstablishmentStatus
from app.schemas.establishment import EstablishmentResponse
from app.api.v1.establishments import establishment_to_response
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime

router = APIRouter(prefix="/establishments", tags=["Profile"])


# ─── Schemas ───────────────────────────────────────────────────────────────────

class ServiceProfile(BaseModel):
    id: UUID
    name: str
    description: str | None
    price: float
    duration_minutes: int
    image_url: str | None
    is_at_home: bool
    model_config = ConfigDict(from_attributes=True)

class StaffProfile(BaseModel):
    id: UUID
    name: str
    photo_url: str | None = Field(None, alias="avatar_url")
    role: str
    bio: str | None
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class ReviewProfile(BaseModel):
    id: UUID
    rating: int
    comment: str | None
    user_name: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class PortfolioProfile(BaseModel):
    id: UUID
    image_url: str
    description: str | None
    model_config = ConfigDict(from_attributes=True)

class EstablishmentProfileResponse(BaseModel):
    establishment: EstablishmentResponse
    services: list[ServiceProfile]
    staff: list[StaffProfile]
    gallery: list[PortfolioProfile]
    reviews: list[ReviewProfile]
    rating: float
    review_count: int


# ─── Endpoint ──────────────────────────────────────────────────────────────────

@router.get("/{establishment_id}/profile", response_model=EstablishmentProfileResponse)
async def get_establishment_profile(
    establishment_id: UUID,
    db: DBSession,
) -> EstablishmentProfileResponse:
    """Get full establishment profile for customer app."""
    
    # 1. Get Establishment
    result = await db.execute(select(Establishment).where(Establishment.id == establishment_id))
    est = result.scalar_one_or_none()
    
    if not est or est.status != EstablishmentStatus.active:
         # Maybe allowed if pending but owner is viewing? For now enforce active for public profile
         if not est:
             raise NotFoundError("Estabelecimento")
    
    # 2. Get Services (Active only)
    services_result = await db.execute(
        select(Service).where(
            Service.establishment_id == establishment_id,
            Service.active == True
        ).order_by(Service.name)
    )
    services = services_result.scalars().all()

    # 3. Get Staff (Active only)
    staff_result = await db.execute(
        select(StaffMember).where(
            StaffMember.establishment_id == establishment_id,
            StaffMember.active == True
        ).order_by(StaffMember.name)
    )
    staff = staff_result.scalars().all()

    # 4. Get Portfolio (Gallery)
    gallery_result = await db.execute(
        select(PortfolioImage).where(
            PortfolioImage.establishment_id == establishment_id
        ).order_by(desc(PortfolioImage.created_at)).limit(20)
    )
    gallery = gallery_result.scalars().all()

    # 5. Get Reviews (Top 5 recent)
    # Also need to fetch user name, usually joined
    # Assuming Review has user relationship
    reviews_result = await db.execute(
        select(Review).options(selectinload(Review.user)).where(
            Review.establishment_id == establishment_id
        ).order_by(desc(Review.created_at)).limit(5)
    )
    reviews_db = reviews_result.scalars().all()
    
    reviews = []
    for r in reviews_db:
        reviews.append(ReviewProfile(
            id=r.id,
            rating=r.rating,
            comment=r.comment,
            user_name=r.user.name if r.user else "Anônimo",
            created_at=r.created_at
        ))

    # 6. Calc Rating
    rating_result = await db.execute(
        select(func.avg(Review.rating), func.count(Review.id)).where(
            Review.establishment_id == establishment_id
        )
    )
    avg_rating, count = rating_result.one()
    
    return EstablishmentProfileResponse(
        establishment=establishment_to_response(est),
        services=[ServiceProfile.model_validate(s) for s in services],
        staff=[StaffProfile.model_validate(s) for s in staff],
        gallery=[PortfolioProfile.model_validate(g) for g in gallery],
        reviews=reviews,
        rating=round(avg_rating, 1) if avg_rating else 0.0,
        review_count=count or 0
    )
