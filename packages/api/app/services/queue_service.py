"""Queue service."""

from collections.abc import Sequence
from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.notification import NotificationType
from app.models.queue import QueueEntry, QueueStatus
from app.schemas.queue import QueueEntryCreate
from app.services.notification_service import NotificationService


class QueueService:
    """Queue service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_by_establishment(
        self,
        establishment_id: UUID,
        status: str | None = None,
    ) -> Sequence[QueueEntry]:
        """List queue entries for an establishment."""
        query = (
            select(QueueEntry)
            .where(QueueEntry.establishment_id == establishment_id)
            .options(
                selectinload(QueueEntry.user),
                selectinload(QueueEntry.service),
                selectinload(QueueEntry.preferred_staff),
                selectinload(QueueEntry.assigned_staff),
            )
        )

        if status:
            query = query.where(QueueEntry.status == status)
        else:
            # Default: show waiting, called, and serving
            query = query.where(
                QueueEntry.status.in_(
                    [QueueStatus.waiting, QueueStatus.called, QueueStatus.serving]
                )
            )

        query = query.order_by(QueueEntry.position)

        result = await self.db.execute(query)
        return result.scalars().all()

    async def list_by_user(self, user_id: UUID) -> Sequence[QueueEntry]:
        """List active queue entries for a user."""
        query = (
            select(QueueEntry)
            .where(
                QueueEntry.user_id == user_id,
                QueueEntry.status.in_(
                    [QueueStatus.waiting, QueueStatus.called, QueueStatus.serving]
                ),
            )
            .options(
                selectinload(QueueEntry.user),
                selectinload(QueueEntry.service),
                selectinload(QueueEntry.preferred_staff),
                selectinload(QueueEntry.assigned_staff),
            )
            .order_by(QueueEntry.entered_at.desc())
        )

        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_user_position(self, establishment_id: UUID, user_id: UUID) -> QueueEntry | None:
        """Get active queue entry for a user in an establishment."""
        result = await self.db.execute(
            select(QueueEntry).where(
                QueueEntry.establishment_id == establishment_id,
                QueueEntry.user_id == user_id,
                QueueEntry.status.in_(
                    [QueueStatus.waiting, QueueStatus.called, QueueStatus.serving]
                ),
            )
        )
        return result.scalar_one_or_none()

    async def join_queue(self, user_id: UUID, data: QueueEntryCreate) -> QueueEntry:
        """Add user to queue."""
        # Check if already in queue
        existing = await self.get_user_position(data.establishment_id, user_id)
        if existing:
            raise ValueError("Você já está na fila deste estabelecimento.")

        # Get last position
        result = await self.db.execute(
            select(func.max(QueueEntry.position)).where(
                QueueEntry.establishment_id == data.establishment_id,
                QueueEntry.status == QueueStatus.waiting,
            )
        )
        last_position = result.scalar() or 0

        entry = QueueEntry(
            establishment_id=data.establishment_id,
            user_id=user_id,
            service_id=data.service_id,
            preferred_staff_id=data.preferred_staff_id,
            position=last_position + 1,
            status=QueueStatus.waiting,
            entered_at=datetime.now(),
        )

        self.db.add(entry)
        await self.db.commit()
        await self.db.refresh(entry)

        return entry

    async def update_status(
        self, entry_id: UUID, status: QueueStatus, assigned_staff_id: UUID | None = None
    ) -> QueueEntry | None:
        """Update queue entry status."""
        entry = await self.db.get(QueueEntry, entry_id)
        if not entry:
            return None

        # current_status = entry.status
        entry.status = status

        if assigned_staff_id:
            entry.assigned_staff_id = assigned_staff_id

        now = datetime.now()

        if status == QueueStatus.called:
            entry.called_at = now
            # Trigger notification
            notif_service = NotificationService(self.db)
            await notif_service.notify(
                user_id=entry.user_id,
                title="Sua vez está chegando!",
                message="Você foi chamado na fila. Por favor, aproxime-se do atendimento.",
                type=NotificationType.queue,
                data={"establishment_id": str(entry.establishment_id), "entry_id": str(entry.id)},
            )
        elif status == QueueStatus.serving:
            entry.started_at = now
            # When serving starts, remove from 'waiting' position logic?
            # Or keep it until completed?
            # Strategy: Keep in list until completed/left
        elif status in [QueueStatus.completed, QueueStatus.left]:
            entry.completed_at = now
            # Reorder remaining queue
            await self._reorder_queue(entry.establishment_id, entry.position)
            entry.position = 0  # No longer in line

        await self.db.commit()
        await self.db.refresh(entry)
        return entry

    async def leave_queue(self, entry_id: UUID, user_id: UUID) -> bool:
        """User leaves the queue."""
        entry = await self.db.get(QueueEntry, entry_id)
        if not entry:
            return False

        if entry.user_id != user_id:
            return False

        entry.status = QueueStatus.left
        entry.completed_at = datetime.now()

        await self._reorder_queue(entry.establishment_id, entry.position)
        entry.position = 0

        await self.db.commit()
        return True

    async def _reorder_queue(self, establishment_id: UUID, removed_position: int):
        """Decrement position of everyone behind the removed user."""
        if removed_position <= 0:
            return

        # Find all entries with position > removed_position
        result = await self.db.execute(
            select(QueueEntry).where(
                QueueEntry.establishment_id == establishment_id,
                QueueEntry.status == QueueStatus.waiting,
                QueueEntry.position > removed_position,
            )
        )
        entries = result.scalars().all()

        for e in entries:
            e.position -= 1
            # Note: flushing updates in loop might be slow for massive queues,
            # but usually queues are small (<50).
