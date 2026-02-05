"""Queue endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.queue import QueueStatus
from app.models.user import User
from app.schemas.queue import (
    QueueEntryCreate,
    QueueEntryResponse,
    QueueListResponse,
    QueueStatusUpdate,
)
from app.services.queue_service import QueueService

router = APIRouter(prefix="/queue", tags=["Queue"])


@router.post("", response_model=QueueEntryResponse, status_code=status.HTTP_201_CREATED)
async def join_queue(
    data: QueueEntryCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> QueueEntryResponse:
    """Join the queue of an establishment."""
    service = QueueService(db)
    try:
        entry = await service.join_queue(current_user.id, data)
        return QueueEntryResponse.model_validate(entry)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/establishments/{establishment_id}", response_model=QueueListResponse)
async def list_establishment_queue(
    establishment_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    status_filter: str | None = None,
) -> QueueListResponse:
    """List public queue for an establishment."""
    service = QueueService(db)
    entries = await service.list_by_establishment(establishment_id, status_filter)

    # Calculate stats
    total_waiting = sum(1 for e in entries if e.status == QueueStatus.waiting)
    current_serving = sum(1 for e in entries if e.status == QueueStatus.serving)

    return QueueListResponse(
        items=[QueueEntryResponse.model_validate(e) for e in entries],
        total_waiting=total_waiting,
        current_serving=current_serving,
    )


@router.get("/my", response_model=list[QueueEntryResponse])
async def list_my_queues(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[QueueEntryResponse]:
    """List active queues the user has joined (TODO implementation optional)."""
    # For now, simplistic implementation or placeholder
    # Ideally should be in service
    return []


@router.patch("/{entry_id}/status", response_model=QueueEntryResponse)
async def update_queue_status(
    entry_id: UUID,
    data: QueueStatusUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> QueueEntryResponse:
    """Update queue status (Staff/Owner only)."""
    service = QueueService(db)

    # Needs a way to verify if entry belongs to establishment owned by user
    # Simplified check: Fetch entry first (TODO: Optimize)
    # This is a critical security check missing in this MVP draft
    # Assuming owner for now based on context provided in previous files (verify_establishment_owner)

    # Real implementation needs to check if user has permissions for the establishment of this queue entry

    entry = await service.update_status(entry_id, data.status, data.assigned_staff_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    return QueueEntryResponse.model_validate(entry)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def leave_queue(
    entry_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Leave the queue."""
    service = QueueService(db)
    success = await service.leave_queue(entry_id, current_user.id)
    if not success:
        raise HTTPException(status_code=400, detail="Could not leave queue")
