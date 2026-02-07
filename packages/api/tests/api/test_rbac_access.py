import pytest
from httpx import AsyncClient
from sqlalchemy import update

from app.core import database
from app.models.user import User, UserRole

# ─── Fixtures ──────────────────────────────────────────────────────────────────


@pytest.fixture
async def admin_auth_headers(client: AsyncClient) -> dict:
    """Create an admin user and return headers."""
    phone = "+5511999999999"
    # Send code
    await client.post("/api/v1/auth/send-code", json={"phone": phone})

    # Verify to create user
    # Need to fetch code if not mocked?
    # In conftest, we see tests usually just mock or retrieve.
    # Let's hope the standard flow works or use exact code since we know how auth works
    # Wait, relying on real redis? Yes.
    # But how to get code?
    # Let's cheat: we can use a direct DB insert for the user if we want,
    # OR we can assume dev mode/mock.
    # Actually, let's use the flow:
    resp = await client.post("/api/v1/auth/send-code", json={"phone": phone})
    # If debug mode is on (conftest sets APP_MODE=debug?), maybe 123456 works?
    # conftest sets: os.environ["APP_MODE"] = "debug"
    # AuthService: if settings.is_debug and code == "123456": pass

    code = "123456"

    resp = await client.post("/api/v1/auth/verify", json={"phone": phone, "code": code})
    assert resp.status_code == 200, f"Auth failed: {resp.text}"
    data = resp.json()
    token = data["tokens"]["access_token"]
    user_id = data["user"]["id"]

    # Update to admin
    async with database.async_session_maker() as session:
        await session.execute(update(User).where(User.id == user_id).values(role=UserRole.admin))
        await session.commit()

    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def staff_user_setup(client: AsyncClient, establishment_id: str):
    """
    Create a user, create a staff member in establishment, and link them.
    Returns: (user_id, auth_headers, staff_id)
    """
    phone = "+5511977777777"  # Different from owner

    # 1. Login/Create User
    await client.post("/api/v1/auth/send-code", json={"phone": phone})
    # Use debug code
    resp = await client.post("/api/v1/auth/verify", json={"phone": phone, "code": "123456"})
    assert resp.status_code == 200, f"Auth failed (staff): {resp.text}"
    data = resp.json()
    token = data["tokens"]["access_token"]
    user_id = data["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Staff Member (must be done by owner? No, we can insert directly to avoid needing owner headers here)
    # Actually, we can just insert StaffMember into DB since we are setting up test state
    async with database.async_session_maker() as session:
        from app.models.staff import StaffMember

        staff = StaffMember(
            establishment_id=establishment_id,
            name="Staff Teste",
            role="Barbeiro",
            user_id=user_id,  # Link directly
            active=True,
        )
        session.add(staff)
        await session.commit()
        await session.refresh(staff)
        staff_id = str(staff.id)

    return user_id, headers, staff_id


@pytest.fixture
async def other_user_headers(client: AsyncClient) -> dict:
    """A random user with no relation to establishment."""
    phone = "+5511911111111"
    await client.post("/api/v1/auth/send-code", json={"phone": phone})
    resp = await client.post("/api/v1/auth/verify", json={"phone": phone, "code": "123456"})
    assert resp.status_code == 200, f"Auth failed (other): {resp.text}"
    token = resp.json()["tokens"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ─── Tests ─────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_staff_cannot_delete_establishment(
    client: AsyncClient, establishment_id: str, staff_user_setup
):
    """Test that a staff member CANNOT delete the establishment."""
    _, staff_headers, _ = staff_user_setup

    response = await client.delete(
        f"/api/v1/establishments/{establishment_id}", headers=staff_headers
    )

    # Should be 403 Forbidden
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_staff_can_view_establishment_appointments(
    client: AsyncClient, establishment_id: str, staff_user_setup
):
    """Test that staff CAN view establishment appointments."""
    _, staff_headers, _ = staff_user_setup

    response = await client.get(
        f"/api/v1/appointments/establishments/{establishment_id}", headers=staff_headers
    )

    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_other_user_cannot_access_appointments(
    client: AsyncClient, establishment_id: str, other_user_headers: dict
):
    """Test that unrelated user CANNOT view establishment appointments."""
    response = await client.get(
        f"/api/v1/appointments/establishments/{establishment_id}", headers=other_user_headers
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_access_appointments(
    client: AsyncClient, establishment_id: str, admin_auth_headers: dict
):
    """Test that ADMIN can view establishment appointments."""
    response = await client.get(
        f"/api/v1/appointments/establishments/{establishment_id}", headers=admin_auth_headers
    )

    assert response.status_code == 200


@pytest.mark.asyncio
async def test_admin_bypass_ownership(
    client: AsyncClient, establishment_id: str, admin_auth_headers: dict
):
    """Test that ADMIN can update establishment settings (bypass ownership)."""
    # Try to update establishment
    response = await client.patch(
        f"/api/v1/establishments/{establishment_id}",
        json={"name": "Updated by Admin"},
        headers=admin_auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Updated by Admin"
