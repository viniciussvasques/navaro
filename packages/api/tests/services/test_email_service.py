"""Unit tests for EmailService (SMTP)."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

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
        with patch("app.services.email_service.get_cached_bool", return_value=False):
            with patch("app.services.email_service.get_cached_setting", return_value=""):
                yield

    @pytest.fixture
    def mock_settings_enabled(self):
        """Mock settings with email enabled."""
        settings = {
            "smtp_host": "smtp.test.com",
            "smtp_port": "587",
            "smtp_user": "user@test.com",
            "smtp_password": "password123",
            "smtp_from_email": "noreply@test.com",
            "smtp_from_name": "Test App",
        }
        
        def mock_bool(key, default):
            if key == "email_enabled":
                return True
            if key == "smtp_use_tls":
                return True
            return default
        
        def mock_setting(key, default):
            return settings.get(key, default)
        
        with patch("app.services.email_service.get_cached_bool", side_effect=mock_bool):
            with patch("app.services.email_service.get_cached_setting", side_effect=mock_setting):
                yield

    # ─── Property Tests ─────────────────────────────────────────────────────────

    def test_enabled_returns_false_when_disabled(self, email_service, mock_settings_disabled):
        """Test enabled property returns False when email disabled."""
        assert email_service.enabled is False

    def test_enabled_returns_true_when_enabled(self, email_service, mock_settings_enabled):
        """Test enabled property returns True when email enabled."""
        assert email_service.enabled is True

    def test_host_returns_correct_value(self, email_service, mock_settings_enabled):
        """Test host returns correct SMTP host."""
        assert email_service.host == "smtp.test.com"

    def test_port_returns_correct_value(self, email_service, mock_settings_enabled):
        """Test port returns correct SMTP port."""
        assert email_service.port == 587

    def test_port_returns_default_on_invalid(self, email_service):
        """Test port returns 587 on invalid value."""
        with patch("app.services.email_service.get_cached_setting", return_value="invalid"):
            assert email_service.port == 587

    # ─── Send Tests ─────────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_send_returns_true_when_disabled(self, email_service, mock_settings_disabled):
        """Test send returns True (simulated success) when disabled."""
        result = await email_service.send(
            to_email="test@test.com",
            subject="Test",
            body_html="<p>Test</p>"
        )
        assert result is True

    @pytest.mark.asyncio
    async def test_send_returns_false_without_host(self, email_service):
        """Test send returns False when SMTP not configured."""
        with patch("app.services.email_service.get_cached_bool", return_value=True):
            with patch("app.services.email_service.get_cached_setting", return_value=""):
                result = await email_service.send(
                    to_email="test@test.com",
                    subject="Test",
                    body_html="<p>Test</p>"
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
                    body_text="Hello"
                )
                
                assert result is True
                mock_thread.assert_called_once()

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
            time="14:00"
        )
        assert result is True

    @pytest.mark.asyncio
    async def test_send_appointment_reminder(self, email_service, mock_settings_disabled):
        """Test appointment reminder template."""
        result = await email_service.send_appointment_reminder(
            to_email="cliente@test.com",
            customer_name="Maria",
            establishment_name="Salão Beauty",
            time="10:00"
        )
        assert result is True

    @pytest.mark.asyncio
    async def test_send_cancellation(self, email_service, mock_settings_disabled):
        """Test cancellation template."""
        result = await email_service.send_cancellation(
            to_email="cliente@test.com",
            customer_name="Pedro",
            establishment_name="Barbearia Legal",
            reason="Funcionário indisponível"
        )
        assert result is True

    # ─── Singleton Tests ────────────────────────────────────────────────────────

    def test_get_email_service_returns_singleton(self):
        """Test get_email_service returns the same instance."""
        service1 = get_email_service()
        service2 = get_email_service()
        assert service1 is service2
