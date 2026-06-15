---
name: create-api-endpoint
description: Cria endpoint REST FastAPI no DUNNAA seguindo route → service → schema → test. Use quando pedir novo endpoint, rota, feature de API ou integração backend.
---

# Criar Endpoint API — DUNNAA

## Pré-requisitos

- Ler endpoint similar em `app/api/v1/`
- Consultar contrato em `docs/API.md`
- Verificar RBAC necessário

## Checklist

```
- [ ] 1. Schema Pydantic (request + response)
- [ ] 2. Service method
- [ ] 3. Route handler
- [ ] 4. Registrar no router.py
- [ ] 5. Testes pytest
- [ ] 6. Atualizar docs/API.md (se contrato novo)
```

## Passo 1 — Schema

Arquivo: `app/schemas/{domain}.py`

```python
class ExampleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

class ExampleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    created_at: datetime
```

## Passo 2 — Service

Arquivo: `app/services/{domain}_service.py`

```python
class ExampleService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, user_id: UUID, data: ExampleCreate) -> Example:
        entity = Example(name=data.name, user_id=user_id)
        self.db.add(entity)
        await self.db.commit()
        await self.db.refresh(entity)
        return entity
```

## Passo 3 — Route

Arquivo: `app/api/v1/{domain}.py`

```python
from app.api.deps import CurrentUser, DBSession

@router.post("", response_model=ExampleResponse, status_code=201)
async def create_example(data: ExampleCreate, user: CurrentUser, db: DBSession):
    service = ExampleService(db)
    result = await service.create(user.id, data)
    return ExampleResponse.model_validate(result)
```

## Passo 4 — Router

Em `app/api/v1/router.py`:

```python
from app.api.v1 import example
api_router.include_router(example.router)
```

## Passo 5 — Testes

Arquivo: `tests/api/v1/test_{domain}.py`

- Happy path (201/200)
- 401 sem token
- 403 role incorreto
- 400 validação
- 404 recurso inexistente

Usar fixtures de `conftest.py`.

## Passo 6 — Validar

```bash
cd packages/api
ruff check app/api/v1/{domain}.py app/services/{domain}_service.py
pytest tests/api/v1/test_{domain}.py -v
```

## RBAC por establishment

```python
from app.api.deps import verify_establishment_access

await verify_establishment_access(db, user, establishment_id)
```

## Erros

Usar `AppException` subclasses — mensagens em português:

```python
raise NotFoundError("Agendamento não encontrado")
raise ForbiddenError("Sem permissão para esta ação")
```
