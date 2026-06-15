---
name: run-api-tests
description: Executa e cria testes pytest para packages/api DUNNAA. Use ao validar mudanças backend, debugar falhas CI ou adicionar cobertura de testes.
---

# Testes API — DUNNAA

## Setup

```bash
cd packages/api
pip install -e ".[dev]"
docker compose up -d   # raiz do monorepo
./scripts/ensure-test-db.sh   # cria dunnaa_test (pytest não apaga seeds)
alembic upgrade head
```

Pytest usa automaticamente `dunnaa_test` (não o banco `dunnaa` com seeds demo).

## Comandos

```bash
# Suite completa
pytest tests/ -v

# Por domínio
pytest tests/api/v1/test_appointments.py -v

# Críticos (double-booking, RBAC, webhooks)
pytest tests/critical/ -v

# Com coverage
pytest tests/ --cov=app --cov-report=term-missing

# Lint
ruff check .
ruff format --check .
```

## Criar teste novo

Arquivo: `tests/api/v1/test_{feature}.py`

```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_feature(client: AsyncClient, auth_headers: dict):
    response = await client.post(
        "/api/v1/features",
        json={"name": "Teste"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["name"] == "Teste"
```

## Fixtures (conftest.py)

- `client` — AsyncClient com lifespan
- `db` — sessão async limpa por test
- `auth_headers` — token JWT de test user

## Testes RBAC

Testar cada role relevante:

```python
async def test_forbidden_for_customer(client, customer_headers):
    r = await client.delete(f"/api/v1/admin/settings/x", headers=customer_headers)
    assert r.status_code == 403
```

## CI

Pipeline: `.github/workflows/api.yml`
- Postgres 16 + Redis 7 como services
- `DATABASE_URL` apontando para container

## Quando falhar

1. Ler traceback completo
2. Verificar se migration aplicada
3. Usar agent `@backend-debugger`
