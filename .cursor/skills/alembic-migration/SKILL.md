---
name: alembic-migration
description: Cria e valida migrations Alembic no DUNNAA. Use ao alterar models SQLAlchemy, adicionar colunas/tabelas ou sincronizar schema PostgreSQL.
---

# Migration Alembic — DUNNAA

## Quando usar

- Novo model ou coluna
- Alteração de tipo/constraint
- Índice novo para performance

## Workflow

### 1. Alterar model

`packages/api/app/models/{entity}.py` — herdar `BaseModel`.

### 2. Gerar revision

```bash
cd packages/api
alembic revision --autogenerate -m "add_field_to_entity"
```

### 3. Revisar arquivo gerado

`migrations/versions/{hash}_add_field_to_entity.py`

Verificar:
- `upgrade()` e `downgrade()` simétricos
- Tipos corretos (UUID, DateTime timezone-aware)
- Defaults para colunas NOT NULL em tabelas existentes

### 4. Aplicar

```bash
alembic upgrade head
```

### 5. Testar rollback

```bash
alembic downgrade -1
alembic upgrade head
```

### 6. Rodar testes

```bash
pytest tests/ -v
```

## Regras DUNNAA

- Não editar `001_initial.py`
- Naming: `{hash}_descricao_curta.py`
- Documentar mudança relevante em `docs/DATABASE.md`
- Seeds em `seeds/` se dados iniciais necessários

## Env

```bash
# .env em packages/api
DATABASE_URL=postgresql+asyncpg://dunnaa:dunnaa_dev@localhost:5455/dunnaa
```

Docker root: Postgres na porta **5455**.

## Troubleshooting

| Erro | Solução |
|------|---------|
| Target database not up to date | `alembic upgrade head` |
| Autogenerate vazio | model não importado em `migrations/env.py` |
| Multiple heads | `alembic merge heads` |
