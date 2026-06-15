"""Queue service."""

from collections.abc import Sequence
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.establishment import Establishment
from app.models.notification import NotificationType
from app.models.queue import QueueEntry, QueueStatus
from app.models.user import User
from app.schemas.queue import QueueEntryCreate
from app.services.notification_service import NotificationService
from app.services.whatsapp_service import get_whatsapp_service


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

    @staticmethod
    def estimated_wait_minutes(entry: QueueEntry, entries: Sequence[QueueEntry]) -> int | None:
        """Estimate wait based on position and average service duration."""
        if entry.status != QueueStatus.waiting:
            return 0
        ahead = sum(
            1
            for e in entries
            if e.status == QueueStatus.waiting and e.position < entry.position
        )
        avg_minutes = 30
        if entry.service and entry.service.duration_minutes:
            avg_minutes = entry.service.duration_minutes
        return ahead * avg_minutes

    def entry_to_response(self, entry: QueueEntry, entries: Sequence[QueueEntry]) -> dict:
        """Build queue response dict with estimated wait."""
        return {
            "id": entry.id,
            "establishment_id": entry.establishment_id,
            "user_id": entry.user_id,
            "service_id": entry.service_id,
            "preferred_staff_id": entry.preferred_staff_id,
            "assigned_staff_id": entry.assigned_staff_id,
            "position": entry.position,
            "status": entry.status,
            "entered_at": entry.entered_at,
            "called_at": entry.called_at,
            "started_at": entry.started_at,
            "completed_at": entry.completed_at,
            "user_name": entry.user.name if entry.user else None,
            "service_name": entry.service.name if entry.service else None,
            "staff_name": (
                entry.assigned_staff.name
                if entry.assigned_staff
                else (entry.preferred_staff.name if entry.preferred_staff else None)
            ),
            "estimated_wait_minutes": self.estimated_wait_minutes(entry, entries),
        }

    async def join_queue(self, user_id: UUID, data: QueueEntryCreate) -> QueueEntry:
        """Add user to queue."""
        from app.core.geo import haversine_meters

        est = await self.db.get(Establishment, data.establishment_id)
        if not est:
            raise ValueError("Estabelecimento não encontrado.")

        if est.queue_geofence_meters and data.latitude is not None and data.longitude is not None:
            if est.latitude is None or est.longitude is None:
                raise ValueError("Estabelecimento sem localização configurada para fila.")
            distance = haversine_meters(
                data.latitude, data.longitude, float(est.latitude), float(est.longitude)
            )
            max_m = est.queue_geofence_meters
            if distance > max_m:
                raise ValueError(
                    f"Você precisa estar a até {max_m}m do estabelecimento para entrar na fila "
                    f"(distância atual: {int(distance)}m)."
                )
        elif est.queue_geofence_meters and (data.latitude is None or data.longitude is None):
            raise ValueError("Ative a localização para entrar na fila virtual.")

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
            entered_at=datetime.now(timezone.utc),
        )

        self.db.add(entry)
        await self.db.commit()
        await self.db.refresh(entry)

        # WhatsApp: aviso de entrada na fila
        try:
            user = await self.db.get(User, entry.user_id)
            establishment = await self.db.get(Establishment, entry.establishment_id)
            if user and getattr(user, "phone", None) and establishment:
                await get_whatsapp_service().send_queue_joined(
                    user.phone, establishment.name, entry.position
                )
        except Exception:
            pass

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

        now = datetime.now(timezone.utc)

        if status == QueueStatus.called:
            entry.called_at = now
            notif_service = NotificationService(self.db)
            await notif_service.create_in_app(
                user_id=entry.user_id,
                title="Sua vez está chegando!",
                message="Você foi chamado na fila. Por favor, aproxime-se do atendimento.",
                type=NotificationType.queue,
                data={"establishment_id": str(entry.establishment_id), "entry_id": str(entry.id)},
            )
            # WhatsApp: você foi chamado na fila
            try:
                user = await self.db.get(User, entry.user_id)
                establishment = await self.db.get(Establishment, entry.establishment_id)
                if user and getattr(user, "phone", None) and establishment:
                    await get_whatsapp_service().send_queue_called(user.phone, establishment.name)
            except Exception:
                pass
        elif status == QueueStatus.serving:
            entry.started_at = now
            # WhatsApp: atendimento iniciado
            try:
                user = await self.db.get(User, entry.user_id)
                establishment = await self.db.get(Establishment, entry.establishment_id)
                if user and getattr(user, "phone", None) and establishment:
                    await get_whatsapp_service().send_queue_serving(user.phone, establishment.name)
            except Exception:
                pass
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
        entry.completed_at = datetime.now(timezone.utc)

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
