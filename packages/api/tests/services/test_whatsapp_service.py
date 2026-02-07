"""Unit tests for WhatsAppService (Meta Cloud API)."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.whatsapp_service import WhatsAppService, get_whatsapp_service


class TestWhatsAppService:
    """Tests for WhatsAppService."""

    @pytest.fixture
    def whatsapp_service(self):
        """Create WhatsAppService instance."""
        return WhatsAppService()

    @pytest.fixture
    def mock_settings_disabled(self):
        """Mock settings with WhatsApp disabled."""
        settings = {
            "enabled": False,
            "api_url": "https://graph.facebook.com/v18.0",
            "access_token": "",
            "phone_number_id": "",
        }
        with patch(
            "app.services.whatsapp_service.WhatsAppService.get_settings", new_callable=AsyncMock
        ) as mock_get:
            mock_get.return_value = settings
            yield

    @pytest.fixture
    def mock_settings_enabled(self):
        """Mock settings with WhatsApp enabled."""
        settings = {
            "enabled": True,
            "api_url": "https://graph.facebook.com/v18.0",
            "access_token": "test_access_token",
            "phone_number_id": "123456789",
        }
        with patch(
            "app.services.whatsapp_service.WhatsAppService.get_settings", new_callable=AsyncMock
        ) as mock_get:
            mock_get.return_value = settings
            yield

    # ─── Send Text Tests ────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_send_text_returns_true_when_disabled(
        self, whatsapp_service, mock_settings_disabled
    ):
        """Test send_text returns True (simulated success) when disabled."""
        result = await whatsapp_service.send_text(to_phone="+5511999999999", message="Test message")
        assert result is True

    @pytest.mark.asyncio
    async def test_send_text_returns_false_without_token(self, whatsapp_service):
        """Test send_text returns False when not configured."""
        settings = {
            "enabled": True,
            "api_url": "https://graph.facebook.com/v18.0",
            "access_token": "",  # Missing
            "phone_number_id": "123",
        }
        with patch(
            "app.services.whatsapp_service.WhatsAppService.get_settings", new_callable=AsyncMock
        ) as mock_get:
            mock_get.return_value = settings
            result = await whatsapp_service.send_text(to_phone="+5511999999999", message="Test")
            assert result is False

    @pytest.mark.asyncio
    async def test_send_text_normalizes_phone(self, whatsapp_service, mock_settings_enabled):
        """Test send_text normalizes phone number correctly."""
        mock_response = MagicMock()
        mock_response.status_code = 200

        with patch("httpx.AsyncClient") as mock_client:
            mock_instance = AsyncMock()
            mock_instance.post.return_value = mock_response
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            mock_client.return_value = mock_instance

            await whatsapp_service.send_text(to_phone="+55 11 99999-9999", message="Test")

            call_args = mock_instance.post.call_args
            # Phone should be normalized (no +, spaces, or dashes)
            assert call_args[1]["json"]["to"] == "5511999999999"

    @pytest.mark.asyncio
    async def test_send_text_makes_correct_api_call(self, whatsapp_service, mock_settings_enabled):
        """Test send_text makes correct WhatsApp API call."""
        mock_response = MagicMock()
        mock_response.status_code = 200

        with patch("httpx.AsyncClient") as mock_client:
            mock_instance = AsyncMock()
            mock_instance.post.return_value = mock_response
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            mock_client.return_value = mock_instance

            result = await whatsapp_service.send_text(
                to_phone="5511999999999", message="Hello World"
            )

            assert result is True
            mock_instance.post.assert_called_once()
            call_args = mock_instance.post.call_args
            assert "graph.facebook.com" in call_args[0][0]
            assert call_args[1]["json"]["messaging_product"] == "whatsapp"
            assert call_args[1]["json"]["text"]["body"] == "Hello World"

    # ─── Convenience Method Tests ───────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_send_appointment_confirmation(self, whatsapp_service, mock_settings_disabled):
        """Test appointment confirmation message."""
        result = await whatsapp_service.send_appointment_confirmation(
            to_phone="5511999999999",
            establishment_name="Barbearia Top",
            date="15/02/2026",
            time="14:00",
        )
        assert result is True

    @pytest.mark.asyncio
    async def test_send_appointment_reminder(self, whatsapp_service, mock_settings_disabled):
        """Test appointment reminder message."""
        result = await whatsapp_service.send_appointment_reminder(
            to_phone="5511999999999", establishment_name="Salão Beauty", time="10:00"
        )
        assert result is True

    @pytest.mark.asyncio
    async def test_send_verification_code(self, whatsapp_service, mock_settings_disabled):
        """Test verification code message."""
        result = await whatsapp_service.send_verification_code(
            to_phone="5511999999999", code="123456"
        )
        assert result is True

    # ─── Singleton Tests ────────────────────────────────────────────────────────

    def test_get_whatsapp_service_returns_singleton(self):
        """Test get_whatsapp_service returns the same instance."""
        service1 = get_whatsapp_service()
        service2 = get_whatsapp_service()
        assert service1 is service2
