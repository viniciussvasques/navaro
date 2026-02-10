"""
Teste do fluxo completo (adote): criar estabelecimento, cadastrar profissionais,
cadastrar produtos, cadastrar cliente, fazer agendamento.

Pode ser executado com: pytest tests/api/v1/test_full_flow_adopt.py -v
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_full_flow_establishment_staff_products_client_appointment(
    client: AsyncClient,
    auth_headers: dict,
    auth_headers_second_user: dict,
):
    """
    Fluxo completo:
    1. Dono: auth
    2. Dono: criar estabelecimento
    3. Dono: cadastrar profissional (staff)
    4. Dono: cadastrar serviço (para agendamento)
    5. Dono: cadastrar produto
    6. Cliente: auth
    7. Cliente: fazer agendamento (opcionalmente com produto)
    """
    # ─── 1. Dono: autenticação ─────────────────────────────────────────────
    # Usa o usuário padrão do fixture auth_headers (dono/owner).
    owner_headers = auth_headers

    # ─── 2. Dono: criar estabelecimento ─────────────────────────────────────
    business_hours = {
        "mon": {"open": "09:00", "close": "18:00"},
        "tue": {"open": "09:00", "close": "18:00"},
        "wed": {"open": "09:00", "close": "18:00"},
        "thu": {"open": "09:00", "close": "18:00"},
        "fri": {"open": "09:00", "close": "18:00"},
        "sat": {"open": "09:00", "close": "13:00"},
    }
    est_payload = {
        "name": "Barbearia do Zé",
        "category": "barbershop",
        "address": "Rua das Flores, 100",
        "city": "São Paulo",
        "state": "SP",
        "phone": "+551140028922",
        "business_hours": business_hours,
    }
    resp = await client.post("/api/v1/establishments", json=est_payload, headers=owner_headers)
    assert resp.status_code == 201, f"Criar estabelecimento: {resp.text}"
    est_id = resp.json()["id"]

    # ─── 3. Dono: cadastrar profissional ────────────────────────────────────
    staff_payload = {
        "name": "Zé Barbeiro",
        "role": "barbeiro",
        "commission_rate": 50.0,
        "work_schedule": {
            "mon": {"open": "09:00", "close": "18:00"},
            "tue": {"open": "09:00", "close": "18:00"},
            "wed": {"open": "09:00", "close": "18:00"},
            "thu": {"open": "09:00", "close": "18:00"},
            "fri": {"open": "09:00", "close": "18:00"},
            "sat": {"open": "09:00", "close": "13:00"},
        },
    }
    resp = await client.post(
        f"/api/v1/establishments/{est_id}/staff",
        json=staff_payload,
        headers=owner_headers,
    )
    assert resp.status_code == 201, f"Cadastrar profissional: {resp.text}"
    staff_id = resp.json()["id"]

    # ─── 4. Dono: cadastrar serviço (necessário para agendamento) ─────────────
    service_payload = {
        "name": "Corte masculino",
        "price": 45.0,
        "duration_minutes": 30,
    }
    resp = await client.post(
        f"/api/v1/establishments/{est_id}/services",
        json=service_payload,
        headers=owner_headers,
    )
    assert resp.status_code == 201, f"Cadastrar serviço: {resp.text}"
    service_id = resp.json()["id"]

    # ─── 5. Dono: cadastrar produto ──────────────────────────────────────────
    product_payload = {
        "name": "Pomada modeladora",
        "description": "Pomada fixação média",
        "price": 35.0,
        "stock_quantity": 50,
        "active": True,
    }
    resp = await client.post(
        f"/api/v1/establishments/{est_id}/products",
        json=product_payload,
        headers=owner_headers,
    )
    assert resp.status_code == 201, f"Cadastrar produto: {resp.text}"
    product_id = resp.json()["id"]

    # ─── 6. Cliente: autenticação ────────────────────────────────────────────
    # Usa o segundo usuário de teste.
    client_headers = auth_headers_second_user
    # Cliente: ver perfil (e obter user_id)
    resp = await client.get("/api/v1/users/me", headers=client_headers)
    assert resp.status_code == 200
    client_user_id = resp.json()["id"]

    # ─── 7. Cliente: fazer agendamento ───────────────────────────────────────
    # Segunda-feira 2026-10-26 14:00 UTC (dentro do horário do estabelecimento e do staff)
    appt_payload = {
        "establishment_id": est_id,
        "service_id": service_id,
        "staff_id": staff_id,
        "scheduled_at": "2026-10-26T14:00:00",
        "payment_type": "single",
        "payment_method": "card",
        "products": [{"product_id": product_id, "quantity": 1}],
    }
    resp = await client.post(
        "/api/v1/appointments",
        json=appt_payload,
        headers=client_headers,
    )
    assert resp.status_code == 201, f"Fazer agendamento: {resp.text}"
    appt = resp.json()
    appt_id = appt["id"]
    assert appt["establishment_id"] == est_id
    assert appt["service_id"] == service_id
    assert appt["staff_id"] == staff_id
    assert appt["user_id"] == client_user_id

    # Cliente: listar meus agendamentos
    resp = await client.get("/api/v1/appointments", headers=client_headers)
    assert resp.status_code == 200
    lista = resp.json()
    assert any(a["id"] == appt_id for a in lista)

    # Dono: listar agendamentos do estabelecimento
    resp = await client.get(
        f"/api/v1/appointments/establishments/{est_id}",
        headers=owner_headers,
    )
    assert resp.status_code == 200
    lista_est = resp.json()
    assert any(a["id"] == appt_id for a in lista_est)


@pytest.mark.asyncio
async def test_full_flow_appointment_without_products(
    client: AsyncClient,
    auth_headers: dict,
):
    """
    Fluxo mínimo: estabelecimento → profissional → serviço → cliente → agendamento (sem produtos).
    """
    owner_headers = auth_headers
    business_hours = {d: {"open": "08:00", "close": "20:00"} for d in ["mon", "tue", "wed", "thu", "fri", "sat"]}
    resp = await client.post(
        "/api/v1/establishments",
        json={
            "name": "Salão Minimal",
            "category": "barbershop",
            "address": "Av. Brasil, 500",
            "city": "Rio",
            "state": "RJ",
            "phone": "+5521999999999",
            "business_hours": business_hours,
        },
        headers=owner_headers,
    )
    assert resp.status_code == 201
    est_id = resp.json()["id"]

    resp = await client.post(
        f"/api/v1/establishments/{est_id}/staff",
        json={"name": "Maria", "role": "barbeiro", "commission_rate": 40.0, "work_schedule": business_hours},
        headers=owner_headers,
    )
    assert resp.status_code == 201
    staff_id = resp.json()["id"]

    resp = await client.post(
        f"/api/v1/establishments/{est_id}/services",
        json={"name": "Barba", "price": 25.0, "duration_minutes": 20},
        headers=owner_headers,
    )
    assert resp.status_code == 201
    service_id = resp.json()["id"]

    # Neste cenário mínimo podemos reutilizar o mesmo usuário de teste como cliente.
    client_headers = auth_headers
    resp = await client.post(
        "/api/v1/appointments",
        json={
            "establishment_id": est_id,
            "service_id": service_id,
            "staff_id": staff_id,
            "scheduled_at": "2026-11-02T10:00:00",
            "payment_type": "single",
            "payment_method": "card",
        },
        headers=client_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["status"] is not None
