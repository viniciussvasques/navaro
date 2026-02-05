
import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta, timezone
from app.models.establishment import EstablishmentCategory
from app.models.appointment import PaymentType

@pytest.mark.asyncio
async def test_appointment_flow(client: AsyncClient):
    """
    Test appointment flow:
    1. Authenticate (User A)
    2. Create Establishment (User A becomes Owner)
    3. Create Service
    4. Create Staff
    5. Create Appointment
    """
    # 1. Authenticate
    phone = "+5511988888888"
    
    # Send code
    resp = await client.post("/api/v1/auth/send-code", json={"phone": phone})
    assert resp.status_code == 200
    msg = resp.json()["message"]
    code = msg.split(": ")[1].strip()
    
    # Verify code
    resp = await client.post("/api/v1/auth/verify", json={"phone": phone, "code": code})
    assert resp.status_code == 200
    token = resp.json()["tokens"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Create Establishment
    est_data = {
        "name": "Barbearia Teste",
        "category": "barbershop",  # Use value string
        "address": "Rua Teste, 123",
        "city": "São Paulo",
        "state": "SP",
        "phone": "+551133333333"
    }
    resp = await client.post("/api/v1/establishments", json=est_data, headers=headers)
    assert resp.status_code == 201
    est_id = resp.json()["id"]
    
    # 3. Create Service
    service_data = {
        "name": "Corte Masculino",
        "price": 50.0,
        "duration_minutes": 30
    }
    resp = await client.post(
        f"/api/v1/establishments/{est_id}/services", 
        json=service_data, 
        headers=headers
    )
    assert resp.status_code == 201
    service_id = resp.json()["id"]
    
    # 4. Create Staff
    staff_data = {
        "name": "João Barbeiro",
        "role": "barbeiro",
        "commission_rate": 50.0
    }
    resp = await client.post(
        f"/api/v1/establishments/{est_id}/staff", 
        json=staff_data, 
        headers=headers
    )
    assert resp.status_code == 201
    staff_id = resp.json()["id"]
    
    # 5. Create Appointment
    scheduled_at = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    appt_data = {
        "establishment_id": est_id,
        "service_id": service_id,
        "staff_id": staff_id,
        "scheduled_at": scheduled_at,
        "payment_type": "single"
    }
    resp = await client.post("/api/v1/appointments", json=appt_data, headers=headers)
    assert resp.status_code == 201, f"Response: {resp.text}"
    appt = resp.json()
    assert appt["establishment_id"] == est_id
    assert appt["service_id"] == service_id
    assert appt["status"] == "pending"
    
    # 6. List Appointments
    resp = await client.get("/api/v1/appointments", headers=headers)
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 1
    assert items[0]["id"] == appt["id"]
