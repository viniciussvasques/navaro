"""Unit tests for Scheduler (Background Jobs)."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.services.scheduler import (
    send_appointment_reminders,
    cleanup_expired_queue_entries,
    start_scheduler,
    stop_scheduler,
)


class TestSchedulerJobs:
    """Tests for scheduler jobs."""

    @pytest.fixture
    def mock_services(self):
        """Mock all notification services."""
        with patch("app.services.scheduler.get_sms_service") as mock_sms:
            with patch("app.services.scheduler.get_email_service") as mock_email:
                with patch("app.services.scheduler.get_whatsapp_service") as mock_whatsapp:
                    with patch("app.services.scheduler.get_push_service") as mock_push:
                        sms_instance = MagicMock()
                        sms_instance.send_appointment_reminder = AsyncMock(return_value=True)
                        mock_sms.return_value = sms_instance
                        
                        email_instance = MagicMock()
                        email_instance.send_appointment_reminder = AsyncMock(return_value=True)
                        mock_email.return_value = email_instance
                        
                        whatsapp_instance = MagicMock()
                        whatsapp_instance.send_appointment_reminder = AsyncMock(return_value=True)
                        mock_whatsapp.return_value = whatsapp_instance
                        
                        push_instance = MagicMock()
                        push_instance.send = AsyncMock(return_value=True)
                        mock_push.return_value = push_instance
                        
                        yield {
                            "sms": sms_instance,
                            "email": email_instance,
                            "whatsapp": whatsapp_instance,
                            "push": push_instance,
                        }

    # ─── Reminder Job Tests ─────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_send_appointment_reminders_no_appointments(self, mock_services):
        """Test reminder job with no pending appointments."""
        # Mock empty database result
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_db.execute.return_value = mock_result
        mock_db.__aenter__.return_value = mock_db
        mock_db.__aexit__.return_value = None

        with patch("app.services.scheduler.async_session_factory", return_value=mock_db):
            count = await send_appointment_reminders()
            assert count == 0

    @pytest.mark.asyncio
    async def test_send_appointment_reminders_with_appointment(self, mock_services):
        """Test reminder job sends reminders for pending appointments."""
        # Create mock appointment
        mock_appointment = MagicMock()
        mock_appointment.id = uuid4()
        mock_appointment.user_id = uuid4()
        mock_appointment.establishment_id = uuid4()
        mock_appointment.scheduled_at = datetime.now(timezone.utc) + timedelta(hours=24)
        mock_appointment.reminder_sent = False

        # Create mock user
        mock_user = MagicMock()
        mock_user.id = mock_appointment.user_id
        mock_user.phone = "5511999999999"
        mock_user.email = "test@test.com"
        mock_user.name = "Test User"

        # Create mock establishment
        mock_establishment = MagicMock()
        mock_establishment.id = mock_appointment.establishment_id
        mock_establishment.name = "Test Barbershop"

        # Mock database
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [mock_appointment]
        mock_db.execute.return_value = mock_result
        mock_db.get = AsyncMock(side_effect=lambda model, id: 
            mock_user if id == mock_user.id else 
            mock_establishment if id == mock_establishment.id else None
        )
        mock_db.commit = AsyncMock()
        mock_db.__aenter__.return_value = mock_db
        mock_db.__aexit__.return_value = None

        with patch("app.services.scheduler.async_session_factory", return_value=mock_db):
            count = await send_appointment_reminders()
            
            # Should have sent reminders
            mock_services["sms"].send_appointment_reminder.assert_called()
            mock_services["email"].send_appointment_reminder.assert_called()
            mock_services["whatsapp"].send_appointment_reminder.assert_called()
            
            # Appointment should be marked as reminder_sent
            assert mock_appointment.reminder_sent is True

    @pytest.mark.asyncio
    async def test_send_appointment_reminders_handles_errors(self, mock_services):
        """Test reminder job handles database errors gracefully."""
        with patch("app.services.scheduler.async_session_factory") as mock_factory:
            mock_factory.side_effect = Exception("Database error")
            
            # Should not raise, just return 0
            count = await send_appointment_reminders()
            assert count == 0

    # ─── Cleanup Job Tests ──────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_cleanup_expired_queue_entries_empty(self):
        """Test cleanup with no expired entries."""
        mock_db = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_db.execute.return_value = mock_result
        mock_db.commit = AsyncMock()
        mock_db.__aenter__.return_value = mock_db
        mock_db.__aexit__.return_value = None

        with patch("app.services.scheduler.async_session_factory", return_value=mock_db):
            count = await cleanup_expired_queue_entries()
            assert count == 0

    @pytest.mark.asyncio
    async def test_cleanup_expired_queue_entries_handles_errors(self):
        """Test cleanup handles database errors gracefully."""
        with patch("app.services.scheduler.async_session_factory") as mock_factory:
            mock_factory.side_effect = Exception("Database error")
            
            count = await cleanup_expired_queue_entries()
            assert count == 0

    # ─── Scheduler Control Tests ────────────────────────────────────────────────

    def test_start_scheduler_creates_task(self):
        """Test start_scheduler creates background task."""
        with patch("asyncio.create_task") as mock_create:
            mock_create.return_value = MagicMock()
            
            # Reset global state
            import app.services.scheduler as scheduler
            scheduler._scheduler_task = None
            scheduler._running = False
            
            start_scheduler()
            
            assert scheduler._running is True
            mock_create.assert_called_once()

    def test_stop_scheduler_cancels_task(self):
        """Test stop_scheduler cancels background task."""
        import app.services.scheduler as scheduler
        
        mock_task = MagicMock()
        scheduler._scheduler_task = mock_task
        scheduler._running = True
        
        stop_scheduler()
        
        assert scheduler._running is False
        mock_task.cancel.assert_called_once()
        assert scheduler._scheduler_task is None
