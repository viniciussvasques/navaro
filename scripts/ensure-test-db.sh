#!/usr/bin/env bash
# Cria dunnaa_test se ainda não existir (idempotente).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DB_USER="${POSTGRES_USER:-dunnaa}"
DB_PASS="${POSTGRES_PASSWORD:-dunnaa_dev}"
DB_HOST="${POSTGRES_HOST:-127.0.0.1}"
DB_PORT="${POSTGRES_PORT:-5432}"
COMPOSE="${COMPOSE_CMD:-docker compose}"

run_psql() {
  if command -v psql >/dev/null 2>&1; then
    PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$@"
  else
    $COMPOSE exec -T db psql -U "$DB_USER" "$@"
  fi
}

exists=$(run_psql -d dunnaa -tAc "SELECT 1 FROM pg_database WHERE datname = 'dunnaa_test'" 2>/dev/null || echo "")

if [[ "$exists" == "1" ]]; then
  echo "dunnaa_test já existe."
else
  run_psql -d dunnaa -c "CREATE DATABASE dunnaa_test OWNER ${DB_USER};"
  echo "dunnaa_test criado."
fi
