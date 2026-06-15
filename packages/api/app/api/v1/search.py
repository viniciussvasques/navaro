"""Search history endpoints."""

from uuid import UUID

from fastapi import APIRouter, status
from sqlalchemy import delete, select

from app.api.deps import CurrentUser, DBSession
from app.models.portfolio import SearchHistory
from app.schemas.search import SearchHistoryCreate, SearchHistoryResponse

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("/history", response_model=list[SearchHistoryResponse])
async def list_search_history(
    db: DBSession,
    current_user: CurrentUser,
    limit: int = 20,
) -> list[SearchHistoryResponse]:
    """List user's recent searches (C12)."""
    result = await db.execute(
        select(SearchHistory)
        .where(SearchHistory.user_id == current_user.id)
        .order_by(SearchHistory.created_at.desc())
        .limit(min(limit, 50))
    )
    return [SearchHistoryResponse.model_validate(h) for h in result.scalars().all()]


@router.post("/history", response_model=SearchHistoryResponse, status_code=status.HTTP_201_CREATED)
async def record_search_history(
    data: SearchHistoryCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> SearchHistoryResponse:
    """Save a search query to history."""
    entry = SearchHistory(
        user_id=current_user.id,
        query=data.query.strip(),
        establishment_clicked_id=data.establishment_clicked_id,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return SearchHistoryResponse.model_validate(entry)


@router.delete("/history", status_code=status.HTTP_204_NO_CONTENT)
async def clear_search_history(
    db: DBSession,
    current_user: CurrentUser,
) -> None:
    """Clear all search history for current user."""
    await db.execute(delete(SearchHistory).where(SearchHistory.user_id == current_user.id))
    await db.commit()


@router.delete("/history/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_search_history_entry(
    entry_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> None:
    """Delete one search history entry."""
    result = await db.execute(
        select(SearchHistory).where(
            SearchHistory.id == entry_id,
            SearchHistory.user_id == current_user.id,
        )
    )
    entry = result.scalar_one_or_none()
    if entry:
        await db.delete(entry)
        await db.commit()
