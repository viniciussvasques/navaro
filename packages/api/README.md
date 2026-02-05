# 🔌 Navaro API

Backend profissional em FastAPI para sistema de agendamento de barbearias e salões.

## ⚡ Quick Start

### 1. Pré-requisitos

- Python 3.12+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### 2. Setup do Ambiente

```bash
# Clonar e entrar no diretório
cd packages/api

# Criar ambiente virtual
python -m venv .venv
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/Mac

# Instalar dependências
pip install -e ".[dev]"

# Copiar arquivo de ambiente
cp .env.example .env
```

### 3. Iniciar Banco de Dados

```bash
# Na raiz do projeto
docker-compose up -d
```

### 4. Rodar Migrations

```bash
alembic upgrade head
```

### 5. Rodar Seeds

```bash
python -m seeds.run_seeds
```

### 6. Iniciar Servidor

```bash
# Modo desenvolvimento (com hot reload)
uvicorn app.main:app --reload

# Ou via script
python -m app.main
```

### 7. Acessar Documentação

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## 🏗️ Estrutura do Projeto

```
app/
├── core/           # Core do sistema
│   ├── config.py       # Settings (Pydantic)
│   ├── database.py     # SQLAlchemy async
│   ├── security.py     # JWT, hashing
│   ├── exceptions.py   # Custom exceptions
│   ├── middleware.py   # Middlewares
│   ├── logging.py      # Structured logging
│   └── maintenance.py  # Debug/maintenance system
│
├── models/         # SQLAlchemy models
├── api/            # API routes (FastAPI)
│   └── v1/             # API version 1
│
├── services/       # Business logic (TODO)
├── repositories/   # Data access (TODO)
└── integrations/   # External services (TODO)

migrations/         # Alembic migrations
seeds/              # Seed data
tests/              # Tests
```

---

## 🔧 Sistema de Manutenção

O sistema possui 3 modos de operação:

| Modo | Log Level | SQL Queries | Debug Endpoints |
|------|-----------|-------------|-----------------|
| `production` | ERROR/WARNING | Ocultas | Desabilitados |
| `debug` | DEBUG | Visíveis | Desabilitados |
| `maintenance` | DEBUG | Visíveis + Log | Habilitados |

### Endpoints de Debug (modo maintenance)

```bash
# Health check detalhado
curl -H "X-Admin-Token: <token>" http://localhost:8000/debug/health

# Estatísticas de requests
curl -H "X-Admin-Token: <token>" http://localhost:8000/debug/stats

# Log de SQL queries
curl -H "X-Admin-Token: <token>" http://localhost:8000/debug/sql-log

# Configuração atual
curl -H "X-Admin-Token: <token>" http://localhost:8000/debug/config
```

---

## 📡 API Endpoints

### Auth

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/v1/auth/send-code` | Enviar código de verificação |
| POST | `/api/v1/auth/verify` | Verificar código e obter token |
| POST | `/api/v1/auth/refresh` | Atualizar tokens |

### Users

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/v1/users/me` | Dados do usuário atual |
| PATCH | `/api/v1/users/me` | Atualizar perfil |
| GET | `/api/v1/users` | Listar usuários (admin) |

### Establishments

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/v1/establishments` | Listar estabelecimentos |
| POST | `/api/v1/establishments` | Criar estabelecimento |
| GET | `/api/v1/establishments/{id}` | Obter estabelecimento |
| PATCH | `/api/v1/establishments/{id}` | Atualizar estabelecimento |
| DELETE | `/api/v1/establishments/{id}` | Deletar (soft delete) |

### Services

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/v1/establishments/{id}/services` | Listar serviços |
| POST | `/api/v1/establishments/{id}/services` | Criar serviço |
| PATCH | `/api/v1/establishments/{id}/services/{sid}` | Atualizar |
| DELETE | `/api/v1/establishments/{id}/services/{sid}` | Deletar |

### Staff

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/v1/establishments/{id}/staff` | Listar funcionários |
| POST | `/api/v1/establishments/{id}/staff` | Criar funcionário |
| PATCH | `/api/v1/establishments/{id}/staff/{sid}` | Atualizar |
| DELETE | `/api/v1/establishments/{id}/staff/{sid}` | Deletar |

---

## 🧪 Testes

```bash
# Rodar todos os testes
pytest

# Com cobertura
pytest --cov=app

# Apenas unit tests
pytest -m unit

# Apenas integration tests
pytest -m integration
```

---

## 📋 Comandos Úteis

```bash
# Linting
ruff check app/
ruff check app/ --fix

# Type checking
mypy app/

# Nova migration
alembic revision --autogenerate -m "description"

# Reverter migration
alembic downgrade -1
```

---

## 🔐 Autenticação

A API usa JWT tokens via header `Authorization: Bearer <token>`.

### Roles

| Role | Permissões |
|------|------------|
| `customer` | Agendar, favoritar, avaliar |
| `owner` | Gerenciar estabelecimento |
| `staff` | Ver agenda, atender |
| `admin` | Tudo |

---

## 📄 Licença

Proprietário - Todos os direitos reservados.
