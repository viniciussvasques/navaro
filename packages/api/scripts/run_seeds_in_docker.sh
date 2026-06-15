#!/bin/bash
# Roda os seeds dentro do container da API (banco acessível como dunnaa-db).
# Uso: da raiz do repo: ./packages/api/scripts/run_seeds_in_docker.sh
# Ou: docker compose exec api python -m seeds.run_seeds (com DATABASE_URL do container)

set -e
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

echo "Rodando seeds dentro do container da API..."
docker compose exec api bash -c "cd /app && PYTHONPATH=. python -m seeds.run_seeds"

echo "Seeds concluídos. Use os usuários de teste no Pro:"
echo "  Donos: dono.pix@teste.dunnaa.com.br / dono.salao@teste.dunnaa.com.br  |  Senha: teste123"
echo "  Cliente: cliente@teste.dunnaa.com.br  |  Senha: teste123"
