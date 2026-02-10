#!/bin/bash
set -e

cd /root/projetos/navaro/packages/api
source .venv/bin/activate

export DATABASE_URL="postgresql+asyncpg://dunnaa:dunnaa_dev@localhost:5432/dunnaa"

echo "Running tests with coverage..."
pytest --cov=app --cov-report=term --cov-report=html -q > /tmp/test_results.txt 2>&1

echo "Tests completed. Results saved to /tmp/test_results.txt"
cat /tmp/test_results.txt
