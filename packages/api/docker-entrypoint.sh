#!/bin/sh
set -e

echo "[dunnaa-api] Applying database migrations..."
alembic upgrade head

echo "[dunnaa-api] Starting server (workers=${UVICORN_WORKERS:-2})..."
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "${PORT:-8000}" \
  --workers "${UVICORN_WORKERS:-2}"
