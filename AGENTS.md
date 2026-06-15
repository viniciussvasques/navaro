# AGENTS.md — Instruções para Agentes AI

> Projeto **DUNNAA** (codebase Navaro) — `/root/projetos/navaro`

## Marca

| Item | Valor |
|------|-------|
| App cliente | **DUNNAA** |
| App profissional | **DUNNAA Pro** |
| Domínio | **dunnaa.com.br** |
| API produção | `https://api.dunnaa.com.br/api/v1` |
| Admin | `https://admin.dunnaa.com.br` |
| Pro Web | `https://pro.dunnaa.com.br` |

## Monorepo (estrutura real)

| Pacote | Stack | Status |
|--------|-------|--------|
| `packages/api` | FastAPI + SQLAlchemy async + PostgreSQL + Redis | ✅ principal |
| `packages/web-admin` | Next.js — Admin | ✅ |
| `packages/dunnaa-pro-web` | Next.js — DUNNAA Pro Web | ✅ |
| `packages/website` | Next.js — site público | ✅ |
| `packages/app-customer` | Expo — app cliente | 🔄 |
| `packages/app-pro` | Expo — DUNNAA Pro mobile | 🔄 |
| `packages/whatsapp-bridge` | Node — WhatsApp | ✅ |

> Não existe `packages/shared` ainda — tipos duplicados entre frontends.

## Docs obrigatórias

- `docs/BLUEPRINT.md` — visão geral e gaps
- `INSTRUCTIONS.md` — setup e rename
- `docs/FEATURES.md`, `docs/API.md`, `docs/DATABASE.md`
- `docs/BACKEND_REVIEW.md` — dívida técnica

## Princípios

### Backend

```
Routes (app/api/v1/*.py)
  → Services (app/services/*.py)
  → Models (app/models/*.py)
  → Schemas (app/schemas/*.py)
```

- Fonte canônica: `app/core/config.py`, `app/api/deps.py`
- Exceções: `AppException` e subclasses
- Pagamentos: factory em `app/services/payment_providers/`
- WhatsApp: `whatsapp_service.py` + bridge `:3100`

### Rename em progresso

- Substituir `navaro` por `dunnaa` em runtime (Redis keys, env)
- Não quebrar testes — atualizar asserts junto

### Segurança

- Nunca commitar secrets
- OTP em Redis (prefixo alvo: `dunnaa:`)
- RBAC: owner, admin, staff ativo

## Comandos

```bash
docker compose up -d              # raiz do projeto
cd packages/api && alembic upgrade head
pnpm dev:api
cd packages/api && pytest tests/ -v
```

## Cursor

| Tipo | Local |
|------|-------|
| Rules | `.cursor/rules/*.mdc` |
| Agents | `.cursor/agents/*.md` |
| Skills | `.cursor/skills/*/SKILL.md` |
| Commands | `.cursor/commands/*.md` |

## Escopo de mudanças

- Mudanças mínimas e focadas
- Novo endpoint: route + schema + service + teste
- Schema DB: model + migration Alembic
- Preferir melhorar este repo — não recriar deploy mínimo em `/opt/Dunnaa`
