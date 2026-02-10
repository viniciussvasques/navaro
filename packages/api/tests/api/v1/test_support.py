import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_create_ticket(
    client: AsyncClient,
    auth_headers: dict,
):
    """Test creating a support ticket."""
    response = await client.post(
        "/api/v1/support/tickets",
        headers=auth_headers,
        json={"title": "Help me with payment", "priority": "high", "category": "financial"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Help me with payment"
    assert data["priority"] == "high"
    assert data["category"] == "financial"
    assert data["status"] == "open"


async def test_list_tickets(
    client: AsyncClient,
    auth_headers: dict,
):
    """Test listing tickets."""
    # Create a ticket first
    await client.post(
        "/api/v1/support/tickets",
        headers=auth_headers,
        json={"title": "My Ticket", "priority": "medium", "category": "general"},
    )

    # Customer lists own tickets
    res_customer = await client.get("/api/v1/support/tickets", headers=auth_headers)
    assert res_customer.status_code == 200
    data_customer = res_customer.json()
    assert len(data_customer["items"]) >= 1


async def test_add_message(
    client: AsyncClient,
    auth_headers: dict,
):
    """Test messaging in a ticket."""
    # Create ticket
    res = await client.post(
        "/api/v1/support/tickets",
        headers=auth_headers,
        json={"title": "Chat Ticket", "priority": "low", "category": "technical"},
    )
    ticket_id = res.json()["id"]

    # Customer sends message
    msg_res = await client.post(
        f"/api/v1/support/tickets/{ticket_id}/messages",
        headers=auth_headers,
        json={"content": "Hello support!"},
    )
    assert msg_res.status_code == 200

    # Verify messages in ticket details
    details_res = await client.get(f"/api/v1/support/tickets/{ticket_id}", headers=auth_headers)
    details = details_res.json()
    assert len(details["messages"]) == 1
