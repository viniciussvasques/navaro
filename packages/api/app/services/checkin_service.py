"""Check-in service."""

import base64
from datetime import datetime, timedelta
from io import BytesIO
from uuid import UUID

import qrcode
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment, AppointmentStatus, Checkin
from app.models.establishment import Establishment
from app.models.queue import QueueEntry, QueueStatus


class CheckinService:
    """Check-in service."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_qr_token(self, establishment_id: UUID) -> dict:
        """
        Generate a secure JWT QR token for establishment check-in.
        Returns both the token and a Base64 encoded PNG image.
        """
        from jose import jwt

        from app.core.config import settings

        expires_at = datetime.utcnow() + timedelta(minutes=15)

        # Create JWT token with establishment info
        payload = {"sub": str(establishment_id), "type": "checkin", "exp": expires_at}
        qr_token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

        # Generate QR Code image
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(qr_token)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        qr_image_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

        return {
            "qr_token": qr_token,
            "qr_image_base64": f"data:image/png;base64,{qr_image_base64}",
            "expires_at": expires_at,
        }

    async def perform_checkin(self, user_id: UUID, qr_token: str) -> dict:
        """
        Perform check-in using a JWT QR token.
        If no appointment exists but queue_mode is enabled, create a queue entry.
        """
        from jose import JWTError, jwt

        from app.core.config import settings

        # 1. Decode and validate JWT
        try:
            payload = jwt.decode(qr_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        except JWTError:
            raise ValueError("Token de QR code inválido ou expirado.")

        if payload.get("type") != "checkin":
            raise ValueError("Token não é válido para check-in.")

        establishment_id_str = payload.get("sub")
        if not establishment_id_str:
            raise ValueError("Estabelecimento inválido no token.")

        try:
            establishment_id = UUID(establishment_id_str)
        except ValueError:
            raise ValueError("Estabelecimento inválido no token.")

        # 2. Check if establishment exists
        est_result = await self.db.execute(
            select(Establishment).where(Establishment.id == establishment_id)
        )
        establishment = est_result.scalar_one_or_none()
        if not establishment:
            raise ValueError("Estabelecimento não encontrado.")

        # 3. Try to find a pending appointment
        appt_result = await self.db.execute(
            select(Appointment)
            .where(
                Appointment.user_id == user_id,
                Appointment.establishment_id == establishment_id,
                Appointment.status == AppointmentStatus.pending,
            )
            .limit(1)
        )
        appointment = appt_result.scalar_one_or_none()

        # 4. If no appointment, check if queue mode is enabled
        if not appointment:
            if not establishment.queue_mode_enabled:
                raise ValueError(
                    "Você não possui um agendamento pendente. O modo fila não está ativo."
                )

            # Create queue entry automatically
            # Get next position
            pos_result = await self.db.execute(
                select(func.coalesce(func.max(QueueEntry.position), 0) + 1).where(
                    QueueEntry.establishment_id == establishment_id,
                    QueueEntry.status == QueueStatus.waiting,
                )
            )
            next_position = pos_result.scalar() or 1

            queue_entry = QueueEntry(
                user_id=user_id,
                establishment_id=establishment_id,
                position=next_position,
                status=QueueStatus.waiting,
                entered_at=datetime.utcnow(),
            )
            self.db.add(queue_entry)
            await self.db.commit()

            return {
                "success": True,
                "establishment_id": establishment_id,
                "queue_position": next_position,
                "message": f"Check-in realizado! Você está na posição {next_position} da fila em {establishment.name}.",
            }

        # 5. Has appointment - record check-in
        checkin = Checkin(
            user_id=user_id,
            establishment_id=establishment_id,
            appointment_id=appointment.id,
            checked_in_at=datetime.utcnow(),
        )
        self.db.add(checkin)
        await self.db.commit()

        return {
            "success": True,
            "establishment_id": establishment_id,
            "appointment_id": appointment.id,
            "message": f"Check-in realizado com sucesso em {establishment.name}.",
        }
