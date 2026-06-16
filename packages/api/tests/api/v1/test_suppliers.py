"""Testes do módulo B2B de fornecedores (suppliers + supplier-orders)."""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


SUPPLIER_PAYLOAD = {
    "name": "Distribuidora Alfa",
    "segment": "chemicals",
    "phone": "+5511944444444",
    "city": "São Paulo",
    "state": "SP",
}


async def _create_supplier(client: AsyncClient, headers: dict) -> dict:
    resp = await client.post("/api/v1/suppliers", json=SUPPLIER_PAYLOAD, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _create_product(client: AsyncClient, headers: dict, supplier_id: str, **over) -> dict:
    payload = {"name": "Shampoo Pro 5L", "price": 89.90, "unit": "unit", "moq": 2, **over}
    resp = await client.post(
        f"/api/v1/suppliers/{supplier_id}/products", json=payload, headers=headers
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


# ─── Supplier profile ──────────────────────────────────────────────────────────


async def test_create_supplier_promotes_role(client: AsyncClient, auth_headers: dict):
    supplier = await _create_supplier(client, auth_headers)
    assert supplier["name"] == SUPPLIER_PAYLOAD["name"]
    assert supplier["verified"] is False

    # Role do usuário deve virar 'supplier'
    me = await client.get("/api/v1/users/me", headers=auth_headers)
    assert me.status_code == 200
    assert me.json()["role"] == "supplier"


async def test_create_supplier_duplicate_blocked(client: AsyncClient, auth_headers: dict):
    await _create_supplier(client, auth_headers)
    resp = await client.post("/api/v1/suppliers", json=SUPPLIER_PAYLOAD, headers=auth_headers)
    assert resp.status_code == 409, resp.text


async def test_get_my_supplier(client: AsyncClient, auth_headers: dict):
    created = await _create_supplier(client, auth_headers)
    resp = await client.get("/api/v1/suppliers/my", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == created["id"]


async def test_public_list_hides_pii(client: AsyncClient, auth_headers: dict):
    await _create_supplier(client, auth_headers)
    resp = await client.get("/api/v1/suppliers")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    # SupplierPublicResponse não deve expor owner_user_id
    assert "owner_user_id" not in data["items"][0]


async def test_public_detail_hides_pii(client: AsyncClient, auth_headers: dict):
    supplier = await _create_supplier(client, auth_headers)
    resp = await client.get(f"/api/v1/suppliers/{supplier['id']}")
    assert resp.status_code == 200
    assert "owner_user_id" not in resp.json()


# ─── RBAC ──────────────────────────────────────────────────────────────────────


async def test_other_user_cannot_edit_supplier(
    client: AsyncClient, auth_headers: dict, auth_headers_second_user: dict
):
    supplier = await _create_supplier(client, auth_headers)
    resp = await client.patch(
        f"/api/v1/suppliers/{supplier['id']}",
        json={"name": "Hacked"},
        headers=auth_headers_second_user,
    )
    assert resp.status_code == 403, resp.text


async def test_other_user_cannot_add_product(
    client: AsyncClient, auth_headers: dict, auth_headers_second_user: dict
):
    supplier = await _create_supplier(client, auth_headers)
    resp = await client.post(
        f"/api/v1/suppliers/{supplier['id']}/products",
        json={"name": "X", "price": 10},
        headers=auth_headers_second_user,
    )
    assert resp.status_code == 403, resp.text


async def test_create_supplier_requires_auth(client: AsyncClient):
    resp = await client.post("/api/v1/suppliers", json=SUPPLIER_PAYLOAD)
    assert resp.status_code == 401


# ─── Admin verify ──────────────────────────────────────────────────────────────


async def test_admin_can_verify_supplier(
    client: AsyncClient, auth_headers: dict, admin_auth_headers: dict
):
    supplier = await _create_supplier(client, auth_headers)
    resp = await client.post(
        f"/api/v1/suppliers/{supplier['id']}/verify?verified=true",
        headers=admin_auth_headers,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["verified"] is True


async def test_non_admin_cannot_verify(
    client: AsyncClient, auth_headers: dict, auth_headers_second_user: dict
):
    supplier = await _create_supplier(client, auth_headers)
    resp = await client.post(
        f"/api/v1/suppliers/{supplier['id']}/verify?verified=true",
        headers=auth_headers_second_user,
    )
    assert resp.status_code == 403


# ─── Products & stock ──────────────────────────────────────────────────────────


async def test_product_crud_and_stock(client: AsyncClient, auth_headers: dict):
    supplier = await _create_supplier(client, auth_headers)
    product = await _create_product(client, auth_headers, supplier["id"])
    assert product["moq"] == 2

    # Atualiza estoque
    resp = await client.patch(
        f"/api/v1/suppliers/{supplier['id']}/products/{product['id']}/stock",
        json={"quantity": 100, "min_threshold": 10},
        headers=auth_headers,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["quantity"] == 100

    # Lista produtos mostra estoque
    resp = await client.get(f"/api/v1/suppliers/{supplier['id']}/products")
    assert resp.status_code == 200
    assert resp.json()[0]["stock_qty"] == 100


# ─── B2B orders ────────────────────────────────────────────────────────────────


async def test_order_flow_buyer_and_supplier(
    client: AsyncClient,
    auth_headers: dict,
    auth_headers_second_user: dict,
    establishment_id: str,
):
    """auth_headers = comprador (tem establishment); 2nd user = fornecedor."""
    supplier = await _create_supplier(client, auth_headers_second_user)
    product = await _create_product(client, auth_headers_second_user, supplier["id"], moq=1)
    await client.patch(
        f"/api/v1/suppliers/{supplier['id']}/products/{product['id']}/stock",
        json={"quantity": 50, "min_threshold": 5},
        headers=auth_headers_second_user,
    )

    # Comprador faz pedido
    resp = await client.post(
        "/api/v1/supplier-orders",
        json={
            "supplier_id": supplier["id"],
            "items": [{"product_id": product["id"], "quantity": 3}],
            "notes": "Entregar pela manhã",
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    order = resp.json()
    assert order["status"] == "pending"
    assert float(order["total"]) == pytest.approx(3 * 89.90)

    # Fornecedor vê o pedido em /incoming
    resp = await client.get("/api/v1/supplier-orders/incoming", headers=auth_headers_second_user)
    assert resp.status_code == 200
    assert resp.json()["total"] == 1

    # Fornecedor confirma
    resp = await client.patch(
        f"/api/v1/supplier-orders/{order['id']}/status",
        json={"status": "confirmed"},
        headers=auth_headers_second_user,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "confirmed"

    # Comprador lista seus pedidos
    resp = await client.get("/api/v1/supplier-orders", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["total"] == 1


async def test_order_moq_enforced(
    client: AsyncClient, auth_headers: dict, auth_headers_second_user: dict, establishment_id: str
):
    supplier = await _create_supplier(client, auth_headers_second_user)
    product = await _create_product(client, auth_headers_second_user, supplier["id"], moq=10)

    resp = await client.post(
        "/api/v1/supplier-orders",
        json={"supplier_id": supplier["id"], "items": [{"product_id": product["id"], "quantity": 2}]},
        headers=auth_headers,
    )
    assert resp.status_code == 400, resp.text
    assert resp.json()["error"]["code"] == "MOQ_NOT_MET"


async def test_buyer_can_cancel_pending_order(
    client: AsyncClient, auth_headers: dict, auth_headers_second_user: dict, establishment_id: str
):
    supplier = await _create_supplier(client, auth_headers_second_user)
    product = await _create_product(client, auth_headers_second_user, supplier["id"], moq=1)
    await client.patch(
        f"/api/v1/suppliers/{supplier['id']}/products/{product['id']}/stock",
        json={"quantity": 20, "min_threshold": 2},
        headers=auth_headers_second_user,
    )

    resp = await client.post(
        "/api/v1/supplier-orders",
        json={"supplier_id": supplier["id"], "items": [{"product_id": product["id"], "quantity": 1}]},
        headers=auth_headers,
    )
    assert resp.status_code == 201, resp.text
    order = resp.json()

    resp = await client.patch(
        f"/api/v1/supplier-orders/{order['id']}/cancel", headers=auth_headers
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "cancelled"


async def test_user_without_establishment_cannot_order(
    client: AsyncClient, auth_headers: dict, auth_headers_second_user: dict
):
    # 2nd user é fornecedor mas não tem establishment → não pode comprar
    supplier = await _create_supplier(client, auth_headers)
    product = await _create_product(client, auth_headers, supplier["id"], moq=1)

    resp = await client.post(
        "/api/v1/supplier-orders",
        json={"supplier_id": supplier["id"], "items": [{"product_id": product["id"], "quantity": 1}]},
        headers=auth_headers_second_user,
    )
    assert resp.status_code == 403, resp.text
