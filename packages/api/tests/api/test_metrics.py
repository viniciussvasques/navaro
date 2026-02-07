import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_metrics_endpoint(client: AsyncClient):
    """Test that metrics endpoint returns prometheus data."""
    response = await client.get("/metrics")
    assert response.status_code == 200
    assert "http_requests_total" in response.text
    assert "http_requests_active" in response.text
    assert "http_request_duration_seconds" in response.text

@pytest.mark.asyncio
async def test_metrics_collection(client: AsyncClient):
    """Test that requests increment metrics."""
    # Make a request to a monitored endpoint
    await client.get("/health")
    
    # Check metrics
    response = await client.get("/metrics")
    assert response.status_code == 200
    
    # Verify health check logic excludes it from metrics or includes it
    # Our middleware excludes /health, so let's try a non-excluded path
    # But /metrics is also excluded.
    # We need a dummy endpoint or use a 404
    
    await client.get("/api/v1/non-existent")
    
    response = await client.get("/metrics")
    text = response.text
    
    # Should see 404 count
    assert 'status_code="404"' in text
