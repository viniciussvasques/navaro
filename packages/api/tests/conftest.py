import os

# Set environment variables BEFORE importing app to ensure settings are loaded correctly
os.environ["ENVIRONMENT"] = "development"
os.environ["APP_MODE"] = "debug"

from collections.abc import AsyncGenerator

import pytest
from asgi_lifespan import LifespanManager
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture(scope="function")
async def client() -> AsyncGenerator[AsyncClient, None]:
    """
    Fixture that creates an AsyncClient for testing the FastAPI app.
    Uses LifespanManager to handle startup/shutdown events (DB connection).
    """
    async with LifespanManager(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            yield c


@pytest.fixture
async def auth_headers(client: AsyncClient) -> dict:
    """Create a user and return auth headers."""
    phone = "+5511988888888"
    await client.post("/api/v1/auth/send-code", json={"phone": phone})
    # In test env, code is mocked or predictable if we check logic,
    # but based on test_appointments, we fetch it from response message
    # Re-trigger to get the code
    resp = await client.post("/api/v1/auth/send-code", json={"phone": phone})
    msg = resp.json()["message"]
    code = msg.split(": ")[1].strip()

    resp = await client.post("/api/v1/auth/verify", json={"phone": phone, "code": code})
    token = resp.json()["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def auth_headers_second_user(client: AsyncClient) -> dict:
    """Create a second user and return auth headers."""
    phone = "+5511977777777"
    await client.post("/api/v1/auth/send-code", json={"phone": phone})
    resp = await client.post("/api/v1/auth/send-code", json={"phone": phone})
    msg = resp.json()["message"]
    code = msg.split(": ")[1].strip()

    resp = await client.post("/api/v1/auth/verify", json={"phone": phone, "code": code})
    token = resp.json()["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def establishment_id(client: AsyncClient, auth_headers: dict) -> str:
    """Create an establishment and return its ID."""
    from uuid import uuid4

    est_data = {
        "name": f"Barbearia Teste {uuid4()}",
        "category": "barbershop",
        "address": "Rua Teste, 123",
        "city": "São Paulo",
        "state": "SP",
        "phone": "+551133333333",
    }
    resp = await client.post("/api/v1/establishments", json=est_data, headers=auth_headers)
    assert resp.status_code == 201
    return resp.json()["id"]


@pytest.fixture
async def service_id(client: AsyncClient, auth_headers: dict, establishment_id: str) -> str:
    """Create a service and return its ID."""
    service_data = {"name": "Corte Masculino", "price": 50.0, "duration_minutes": 30}
    resp = await client.post(
        f"/api/v1/establishments/{establishment_id}/services",
        json=service_data,
        headers=auth_headers,
    )
    assert resp.status_code == 201
    return resp.json()["id"]


@pytest.fixture
async def staff_id(client: AsyncClient, auth_headers: dict, establishment_id: str) -> str:
    """Create a staff member and return its ID."""
    staff_data = {"name": "João Barbeiro", "role": "barbeiro", "commission_rate": 50.0}
    resp = await client.post(
        f"/api/v1/establishments/{establishment_id}/staff", json=staff_data, headers=auth_headers
    )
    assert resp.status_code == 201
    return resp.json()["id"]
