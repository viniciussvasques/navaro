import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """
    Test the health check endpoint to ensure API is responsive.
    """
    response = await client.get("/health")
    assert response.status_code == 200, f"Health Check Failed: {response.text}"
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
