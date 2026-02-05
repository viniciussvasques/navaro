"""Portfolio endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.portfolio import (
    PortfolioImageCreate,
    PortfolioImageResponse,
    PortfolioListResponse,
)
from app.services.portfolio_service import PortfolioService

router = APIRouter(prefix="/portfolio", tags=["Portfolio"])


@router.post("", response_model=PortfolioImageResponse, status_code=status.HTTP_201_CREATED)
async def add_portfolio_image(
    data: PortfolioImageCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Add a new image to the portfolio."""
    service = PortfolioService(db)
    return await service.add_image(current_user.id, data)


@router.delete("/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_portfolio_image(
    image_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Remove an image from the portfolio."""
    service = PortfolioService(db)
    await service.remove_image(current_user.id, image_id)


@router.get("/establishments/{establishment_id}", response_model=PortfolioListResponse)
async def list_establishment_portfolio(
    establishment_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """List portfolio images for an establishment."""
    service = PortfolioService(db)
    skip = (page - 1) * page_size
    items, total = await service.list_by_establishment(establishment_id, skip, page_size)
    return PortfolioListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/staff/{staff_id}", response_model=PortfolioListResponse)
async def list_staff_portfolio(
    staff_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """List portfolio images for a staff member."""
    service = PortfolioService(db)
    skip = (page - 1) * page_size
    items, total = await service.list_by_staff(staff_id, skip, page_size)
    return PortfolioListResponse(items=items, total=total, page=page, page_size=page_size)
