import os

# Set environment variables BEFORE importing app to ensure settings are loaded correctly
os.environ["ENVIRONMENT"] = "development"
os.environ["APP_MODE"] = "debug"
os.environ["RATE_LIMIT_ENABLED"] = "False"
os.environ["TESTING"] = "True"

from collections.abc import AsyncGenerator

import pytest
from asgi_lifespan import LifespanManager
from httpx import ASGITransport, AsyncClient


@pytest.fixture(scope="function")
async def db_engine():
    """
    Patch global engine with a fresh one for the test function.
    Ensures connection pool is tied to the correct loop and uses NullPool.
    """
    from app.core import database
    from app.core.config import settings
    from sqlalchemy.pool import NullPool
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

    # Ensure we use the test database URL
    db_url = settings.DATABASE_URL

    # Create fresh engine
    test_engine = create_async_engine(db_url, echo=False, future=True, poolclass=NullPool)

    # Create fresh session factory
    test_session_maker = async_sessionmaker(
        bind=test_engine,
        expire_on_commit=False,
        autoflush=False,
    )

    # Patch global engine and session maker
    original_engine = database.engine
    original_session_maker = database.async_session_maker

    database.engine = test_engine
    database.async_session_maker = test_session_maker

    yield test_engine

    # Restore and cleanup
    await test_engine.dispose()
    database.engine = original_engine
    database.async_session_maker = original_session_maker


@pytest.fixture(autouse=True)
async def clear_db(db_engine):
    """Clear database before each test. Uses patched engine."""
    from app.models.base import Base

    async with db_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield


@pytest.fixture(scope="function")
def app(db_engine):
    """
    Create a fresh app instance for each test.
    Depends on db_engine to ensure patching (for background tasks/lifespan).
    Uses dependency_overrides to bypass global get_db completely.
    """
    from app.main import create_app
    from app.core import database
    from sqlalchemy.ext.asyncio import async_sessionmaker

    from app.core.config import settings
    settings.RATE_LIMIT_ENABLED = False
    settings.TESTING = True
    _app = create_app()

    # Create a completely fresh sessionmaker bound to the test engine
    # This ensures sessions are eager-bound to the current tests's event loop
    test_session_maker = async_sessionmaker(bind=db_engine, expire_on_commit=False, autoflush=False)

    async def override_get_db():
        async with test_session_maker() as session:
            yield session

    _app.dependency_overrides[database.get_db] = override_get_db

    return _app


@pytest.fixture(scope="function")
async def client(app) -> AsyncGenerator[AsyncClient, None]:
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
    resp = await client.post("/api/v1/auth/send-code", json={"phone": phone})
    assert resp.status_code == 200, f"Send Code Failed: {resp.text}"
    message = resp.json()["message"]
    # In dev mode, message format is "Código de verificação: XXXXXX"
    code = message.split(": ")[1].strip()
    resp = await client.post("/api/v1/auth/verify", json={"phone": phone, "code": code})
    assert resp.status_code == 200, f"Auth verify failed: {resp.text}"
    token = resp.json()["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def auth_headers_second_user(client: AsyncClient) -> dict:
    """Create a second user and return auth headers."""
    phone = "+5511977777777"
    resp = await client.post("/api/v1/auth/send-code", json={"phone": phone})
    assert resp.status_code == 200, f"Send Code Failed (2nd user): {resp.text}"
    message = resp.json()["message"]
    # In dev mode, message format is "Código de verificação: XXXXXX"
    code = message.split(": ")[1].strip()
    resp = await client.post("/api/v1/auth/verify", json={"phone": phone, "code": code})
    assert resp.status_code == 200, f"Auth verify failed (2nd user): {resp.text}"
    token = resp.json()["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def establishment_id(client: AsyncClient, auth_headers: dict) -> str:
    """Create an establishment and return its ID."""
    from uuid import uuid4

    business_hours = {
        day: {"open": "08:00", "close": "20:00"}
        for day in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    }
    est_data = {
        "name": f"Barbearia Teste {uuid4()}",
        "category": "barbershop",
        "address": "Rua Teste, 123",
        "city": "São Paulo",
        "state": "SP",
        "phone": "+551133333333",
        "business_hours": business_hours,
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
