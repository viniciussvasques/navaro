"""Favorite endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.favorite import (
    FavoriteEstablishmentResponse,
    FavoriteEstablishmentToggle,
    FavoriteStaffResponse,
    FavoriteStaffToggle,
    UserFavoritesResponse,
)
from app.services.favorite_service import FavoriteService

router = APIRouter(prefix="/favorites", tags=["Favorites"])


@router.post("/establishments", status_code=status.HTTP_200_OK)
async def toggle_favorite_establishment(
    data: FavoriteEstablishmentToggle,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Toggle favorite status for an establishment."""
    service = FavoriteService(db)
    added = await service.toggle_establishment(current_user.id, data.establishment_id)
    return {"added": added}


@router.post("/staff", status_code=status.HTTP_200_OK)
async def toggle_favorite_staff(
    data: FavoriteStaffToggle,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Toggle favorite status for a staff member."""
    service = FavoriteService(db)
    added = await service.toggle_staff(current_user.id, data.staff_id, data.establishment_id)
    return {"added": added}


@router.get("", response_model=UserFavoritesResponse)
async def list_favorites(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserFavoritesResponse:
    """List all user favorites."""
    service = FavoriteService(db)
    favorites_est, favorites_staff = await service.list_user_favorites(current_user.id)

    establishment_items = []
    for f in favorites_est:
        if f.establishment:
            establishment_items.append(
                FavoriteEstablishmentResponse(
                    id=f.id,
                    establishment_id=f.establishment_id,
                    establishment_name=f.establishment.name,
                    establishment_slug=f.establishment.slug,
                    establishment_logo_url=f.establishment.logo_url,
                )
            )

    staff_items = []
    for f in favorites_staff:
        if f.staff and f.establishment:
            staff_items.append(
                FavoriteStaffResponse(
                    id=f.id,
                    staff_id=f.staff_id,
                    staff_name=f.staff.name,
                    establishment_id=f.establishment_id,
                    establishment_name=f.establishment.name,
                )
            )

    return UserFavoritesResponse(establishments=establishment_items, staff=staff_items)
