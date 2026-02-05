"""Unit tests for PushService (FCM)."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.push_service import PushService, get_push_service


class TestPushService:
    """Tests for PushService."""

    @pytest.fixture
    def push_service(self):
        """Create PushService instance."""
        return PushService()

    @pytest.fixture
    def mock_settings_disabled(self):
        """Mock settings with push disabled."""
        with patch("app.services.push_service.get_cached_bool", return_value=False):
            with patch("app.services.push_service.get_cached_setting", return_value=""):
                yield

    @pytest.fixture
    def mock_settings_enabled(self):
        """Mock settings with push enabled."""
        def mock_bool(key, default):
            if key == "fcm_enabled":
                return True
            return default
        
        def mock_setting(key, default):
            if key == "fcm_server_key":
                return "test_server_key"
            return default
        
        with patch("app.services.push_service.get_cached_bool", side_effect=mock_bool):
            with patch("app.services.push_service.get_cached_setting", side_effect=mock_setting):
                yield

    # ─── Property Tests ─────────────────────────────────────────────────────────

    def test_enabled_returns_false_when_disabled(self, push_service, mock_settings_disabled):
        """Test enabled property returns False when FCM disabled."""
        assert push_service.enabled is False

    def test_enabled_returns_true_when_enabled(self, push_service, mock_settings_enabled):
        """Test enabled property returns True when FCM enabled."""
        assert push_service.enabled is True

    def test_server_key_returns_empty_when_not_configured(self, push_service, mock_settings_disabled):
        """Test server_key returns empty string when not configured."""
        assert push_service.server_key == ""

    # ─── Send Tests ─────────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_send_returns_true_when_disabled(self, push_service, mock_settings_disabled):
        """Test send returns True (simulated success) when disabled."""
        result = await push_service.send(
            device_token="test_token",
            title="Test",
            body="Test message"
        )
        assert result is True

    @pytest.mark.asyncio
    async def test_send_returns_false_without_token(self, push_service, mock_settings_enabled):
        """Test send returns False when no device token provided."""
        result = await push_service.send(
            device_token="",
            title="Test",
            body="Test message"
        )
        assert result is False

    @pytest.mark.asyncio
    async def test_send_makes_correct_api_call(self, push_service, mock_settings_enabled):
        """Test send makes correct FCM API call."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"success": 1}

        with patch("httpx.AsyncClient") as mock_client:
            mock_instance = AsyncMock()
            mock_instance.post.return_value = mock_response
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            mock_client.return_value = mock_instance

            result = await push_service.send(
                device_token="test_token",
                title="Test Title",
                body="Test Body",
                data={"key": "value"}
            )

            assert result is True
            mock_instance.post.assert_called_once()
            call_args = mock_instance.post.call_args
            assert "fcm.googleapis.com" in call_args[0][0]
            assert call_args[1]["json"]["to"] == "test_token"
            assert call_args[1]["json"]["notification"]["title"] == "Test Title"

    @pytest.mark.asyncio
    async def test_send_handles_api_error(self, push_service, mock_settings_enabled):
        """Test send handles API errors gracefully."""
        mock_response = MagicMock()
        mock_response.status_code = 500

        with patch("httpx.AsyncClient") as mock_client:
            mock_instance = AsyncMock()
            mock_instance.post.return_value = mock_response
            mock_instance.__aenter__.return_value = mock_instance
            mock_instance.__aexit__.return_value = None
            mock_client.return_value = mock_instance

            result = await push_service.send(
                device_token="test_token",
                title="Test",
                body="Test"
            )

            assert result is False

    # ─── Send to Many Tests ─────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_send_to_many_returns_zero_when_disabled(self, push_service, mock_settings_disabled):
        """Test send_to_many returns 0 when disabled."""
        result = await push_service.send_to_many(
            device_tokens=["token1", "token2"],
            title="Test",
            body="Test"
        )
        assert result == 0

    @pytest.mark.asyncio
    async def test_send_to_many_returns_zero_with_empty_list(self, push_service, mock_settings_enabled):
        """Test send_to_many returns 0 with empty token list."""
        result = await push_service.send_to_many(
            device_tokens=[],
            title="Test",
            body="Test"
        )
        assert result == 0

    # ─── Singleton Tests ────────────────────────────────────────────────────────

    def test_get_push_service_returns_singleton(self):
        """Test get_push_service returns the same instance."""
        service1 = get_push_service()
        service2 = get_push_service()
        assert service1 is service2
