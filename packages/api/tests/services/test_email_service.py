"""Unit tests for EmailService (SMTP)."""

from unittest.mock import AsyncMock, patch

import pytest

from app.services.email_service import EmailService, get_email_service


class TestEmailService:
    """Tests for EmailService."""

    @pytest.fixture
    def email_service(self):
        """Create EmailService instance."""
        return EmailService()

    @pytest.fixture
    def mock_settings_disabled(self):
        """Mock settings with email disabled."""
        settings = {
            "enabled": False,
            "host": "",
            "port": 587,
            "user": "",
            "password": "",
            "from_email": "",
            "from_name": "",
            "use_tls": True,
        }
        with patch("app.services.email_service.EmailService.get_settings", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = settings
            yield

    @pytest.fixture
    def mock_settings_enabled(self):
        """Mock settings with email enabled."""
        settings = {
            "enabled": True,
            "host": "smtp.test.com",
            "port": 587,
            "user": "user@test.com",
            "password": "password123",
            "from_email": "noreply@test.com",
            "from_name": "Test App",
            "use_tls": True,
        }
        with patch("app.services.email_service.EmailService.get_settings", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = settings
            yield

    # ─── Send Tests ─────────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_send_returns_true_when_disabled(self, email_service, mock_settings_disabled):
        """Test send returns True (simulated success) when disabled."""
        result = await email_service.send(
            to_email="test@test.com", subject="Test", body_html="<p>Test</p>"
        )
        assert result is True

    @pytest.mark.asyncio
    async def test_send_returns_false_without_host(self, email_service):
        """Test send returns False when SMTP not configured."""
        settings = {
            "enabled": True,
            "host": "",  # Missing host
            "user": "user",
        }
        with patch("app.services.email_service.EmailService.get_settings", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = settings
            result = await email_service.send(
                to_email="test@test.com", subject="Test", body_html="<p>Test</p>"
            )
            assert result is False

    @pytest.mark.asyncio
    async def test_send_calls_smtp(self, email_service, mock_settings_enabled):
        """Test send calls SMTP correctly."""
        with patch.object(email_service, "_send_smtp") as mock_smtp:
            with patch("asyncio.to_thread", new_callable=AsyncMock) as mock_thread:
                mock_thread.return_value = None

                result = await email_service.send(
                    to_email="test@test.com",
                    subject="Test Subject",
                    body_html="<p>Hello</p>",
                    body_text="Hello",
                )

                assert result is True
                # thread called with msg and settings
                mock_thread.assert_called_once()
                args, _ = mock_thread.call_args
                assert args[0] == email_service._send_smtp
                # args[1] is msg, args[2] is settings
                assert args[2]["host"] == "smtp.test.com"

    # ─── Template Tests ─────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_send_appointment_confirmation(self, email_service, mock_settings_disabled):
        """Test appointment confirmation template."""
        result = await email_service.send_appointment_confirmation(
            to_email="cliente@test.com",
            customer_name="João",
            establishment_name="Barbearia Top",
            service_name="Corte",
            date="15/02/2026",
            time="14:00",
        )
        assert result is True

    @pytest.mark.asyncio
    async def test_send_appointment_reminder(self, email_service, mock_settings_disabled):
        """Test appointment reminder template."""
        result = await email_service.send_appointment_reminder(
            to_email="cliente@test.com",
            customer_name="Maria",
            establishment_name="Salão Beauty",
            time="10:00",
        )
        assert result is True

    @pytest.mark.asyncio
    async def test_send_cancellation(self, email_service, mock_settings_disabled):
        """Test cancellation template."""
        result = await email_service.send_cancellation(
            to_email="cliente@test.com",
            customer_name="Pedro",
            establishment_name="Barbearia Legal",
            reason="Funcionário indisponível",
        )
        assert result is True

    # ─── Singleton Tests ────────────────────────────────────────────────────────

    def test_get_email_service_returns_singleton(self):
        """Test get_email_service returns the same instance."""
        service1 = get_email_service()
        service2 = get_email_service()
        assert service1 is service2
