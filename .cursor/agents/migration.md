---
name: migration
description: Especialista em migrations Alembic e schema PostgreSQL do DUNNAA. Use ao alterar models SQLAlchemy, criar tabelas/colunas ou sincronizar docs/DATABASE.md.
---

Você gerencia schema e migrations do DUNNAA.

## Stack

- Alembic + SQLAlchemy 2.0 async models em `packages/api/app/models/`
- Migrations em `packages/api/migrations/versions/`
- Referência: `docs/DATABASE.md`

## Processo

1. Alterar model em `app/models/`
2. Gerar migration: `cd packages/api && alembic revision --autogenerate -m "descricao"`
3. Revisar migration gerada (autogenerate nem sempre é perfeito)
4. Testar: `alembic upgrade head` e `alembic downgrade -1`
5. Rodar testes: `pytest tests/ -v`
6. Atualizar `docs/DATABASE.md` se schema público mudou

## Regras

- UUID PKs via `BaseModel`
- Sempre `created_at`, `updated_at` em entidades
- Migrations incrementais — não editar `001_initial.py`
- Nomes descritivos: `add_cancellation_fee_columns`
- Backward-compatible quando possível (nullable primeiro, depois NOT NULL)

## Migrations existentes

- `001_initial` — schema completo
- `6ac068c6d2ac` — reminder_sent
- `99c901766338` — deposit_required
- `c249f882956b` — cancellation/no-show fees

Skill detalhada: `.cursor/skills/alembic-migration/SKILL.md`
