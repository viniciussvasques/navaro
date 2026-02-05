"""Background job scheduler for automated tasks."""

import asyncio
from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from app.core.database import async_session_maker as async_session_factory
from app.core.logging import get_logger
from app.models.appointment import Appointment, AppointmentStatus
from app.models.establishment import Establishment
from app.models.user import User
from app.services.email_service import get_email_service
from app.services.push_service import get_push_service
from app.services.sms_service import get_sms_service
from app.services.whatsapp_service import get_whatsapp_service

logger = get_logger(__name__)

# Job scheduler instance
_scheduler_task: asyncio.Task | None = None
_running: bool = False


async def send_appointment_reminders() -> int:
    """
    Send reminders for appointments happening in 24 hours.
    This runs every hour to catch all appointments.

    Returns:
        Number of reminders sent
    """
    logger.info("Running appointment reminder job")

    sms = get_sms_service()
    email = get_email_service()
    whatsapp = get_whatsapp_service()
    push = get_push_service()

    count = 0

    try:
        async with async_session_factory() as db:
            # Find appointments between 23 and 25 hours from now
            now = datetime.now(UTC)
            start_window = now + timedelta(hours=23)
            end_window = now + timedelta(hours=25)

            result = await db.execute(
                select(Appointment).where(
                    Appointment.scheduled_at >= start_window,
                    Appointment.scheduled_at <= end_window,
                    Appointment.status.in_(
                        [AppointmentStatus.pending, AppointmentStatus.confirmed]
                    ),
                    Appointment.reminder_sent == False,  # Don't resend
                )
            )
            appointments = result.scalars().all()

            for appt in appointments:
                try:
                    # Get user and establishment
                    user = await db.get(User, appt.user_id)
                    establishment = await db.get(Establishment, appt.establishment_id)

                    if not user or not establishment:
                        continue

                    time_str = appt.scheduled_at.strftime("%H:%M")

                    # Send SMS
                    if user.phone:
                        await sms.send_appointment_reminder(
                            user.phone, establishment.name, time_str
                        )

                    # Send Email
                    if user.email:
                        await email.send_appointment_reminder(
                            user.email, user.name or "Cliente", establishment.name, time_str
                        )

                    # Send WhatsApp (if preferred channel)
                    if user.phone:
                        await whatsapp.send_appointment_reminder(
                            user.phone, establishment.name, time_str
                        )

                    # Send Push (if device token)
                    if hasattr(user, "device_token") and user.device_token:
                        await push.send(
                            user.device_token,
                            "⏰ Lembrete de Agendamento",
                            f"Você tem horário amanhã às {time_str} em {establishment.name}",
                            data={"appointment_id": str(appt.id)},
                        )

                    # Mark as sent
                    appt.reminder_sent = True
                    count += 1

                except Exception as e:
                    logger.error("Reminder error", appointment_id=str(appt.id), error=str(e))

            await db.commit()

    except Exception as e:
        logger.error("Reminder job error", error=str(e))

    logger.info("Reminder job completed", count=count)
    return count


async def cleanup_expired_queue_entries() -> int:
    """Clean up queue entries older than 24 hours."""
    logger.info("Running queue cleanup job")

    try:
        async with async_session_factory() as db:
            from app.models.queue import QueueEntry, QueueStatus

            threshold = datetime.now(UTC) - timedelta(hours=24)

            result = await db.execute(
                select(QueueEntry).where(
                    QueueEntry.created_at < threshold,
                    QueueEntry.status.in_([QueueStatus.waiting, QueueStatus.no_show]),
                )
            )
            entries = result.scalars().all()

            count = 0
            for entry in entries:
                entry.status = QueueStatus.expired
                count += 1

            await db.commit()
            logger.info("Queue cleanup completed", count=count)
            return count

    except Exception as e:
        logger.error("Queue cleanup error", error=str(e))
        return 0


async def scheduler_loop():
    """Main scheduler loop that runs jobs periodically."""
    global _running

    logger.info("Scheduler started")

    while _running:
        try:
            current_minute = datetime.now().minute

            # Run reminder job every hour (at minute 0)
            if current_minute == 0:
                await send_appointment_reminders()

            # Run cleanup job at midnight (at minute 5)
            if current_minute == 5 and datetime.now().hour == 0:
                await cleanup_expired_queue_entries()

            # Sleep for 1 minute
            await asyncio.sleep(60)

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error("Scheduler error", error=str(e))
            await asyncio.sleep(60)

    logger.info("Scheduler stopped")


def start_scheduler():
    """Start the background scheduler."""
    global _scheduler_task, _running

    if _scheduler_task is not None:
        logger.warning("Scheduler already running")
        return

    _running = True
    _scheduler_task = asyncio.create_task(scheduler_loop())
    logger.info("Background scheduler started")


def stop_scheduler():
    """Stop the background scheduler."""
    global _scheduler_task, _running

    _running = False

    if _scheduler_task is not None:
        _scheduler_task.cancel()
        _scheduler_task = None
        logger.info("Background scheduler stopped")


# Manual trigger for testing
async def run_all_jobs():
    """Run all scheduled jobs manually (for testing)."""
    await send_appointment_reminders()
    await cleanup_expired_queue_entries()
