# Dev API

Inicia o ambiente de desenvolvimento do backend DUNNAA.

## Passos

1. Verificar Docker: `docker-compose up -d` (Postgres 5455, Redis 6385)
2. Migrations: `cd packages/api && alembic upgrade head`
3. Seeds (opcional): `python -m seeds.run_seeds`
4. Servidor: `pnpm dev:api` ou `uvicorn app.main:app --reload --port 8000`

## URLs

- API: http://localhost:8000
- Docs: http://localhost:8000/docs (modo debug)
- Health: http://localhost:8000/health

## Env

Copiar `packages/api/.env.example` → `.env` se não existir.
