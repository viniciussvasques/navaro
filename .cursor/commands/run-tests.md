# Run Tests

Executa testes do backend DUNNAA.

## Comando

```bash
cd packages/api
pytest tests/ -v --tb=short
```

## Variantes

```bash
# Apenas críticos
pytest tests/critical/ -v

# Arquivo específico
pytest tests/api/v1/test_auth.py -v

# Com coverage
pytest tests/ --cov=app --cov-report=term-missing
```

## Pré-requisitos

- Docker up (`docker-compose up -d`)
- `alembic upgrade head`
- `pip install -e ".[dev]"`

Siga a skill `run-api-tests` para criar novos testes.
