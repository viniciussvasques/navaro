# DUNNAA

> 💈 Sistema de agendamento e assinaturas para barbearias e salões

## 📱 Apps

- **DUNNAA** - App para clientes (React Native/Expo)
- **DUNNAA Pro** - App para estabelecimentos (React Native/Expo)
- **DUNNAA Pro Web** - App web para estabelecimentos (Next.js)
- **Admin** - Painel administrativo (Next.js)

## 🏗️ Arquitetura

```
dunnaa/
├── apps/
│   ├── cliente/              # App Cliente (Expo)
│   ├── barbeiro/             # App Estabelecimento mobile (Expo)
│   ├── estabelecimento-web/  # App Estabelecimento web (Next.js)
│   └── admin/                # Painel Admin (Next.js)
├── packages/
│   ├── api/              # Backend (FastAPI)
│   ├── database/         # Models + Migrations
│   └── shared/           # Tipos compartilhados
├── docs/                 # Documentação
└── docker-compose.yml    # Dev environment
```

## 🚀 Quick Start

### Pré-requisitos

- Node.js 20+
- Python 3.12+
- Docker & Docker Compose
- pnpm

### Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/dunnaa.git
cd dunnaa

# Instale dependências
pnpm install

# Suba tudo no container (DB, Redis, API, Admin, WhatsApp Bridge)
pnpm docker:up

# Para desenvolvimento local, todos os processos rodam nos containers.
# API: http://localhost:8000 | Admin: http://localhost:3005 | WhatsApp Bridge: http://localhost:3100
#
# Ou inicie apenas alguns apps fora do Docker (se preferir):
# pnpm dev:api
# pnpm dev:cliente
# pnpm dev:barbeiro
# pnpm dev:admin
```

## 📚 Documentação

- [Arquitetura](docs/ARCHITECTURE.md)
- [Features](docs/FEATURES.md)
- [Banco de Dados](docs/DATABASE.md)
- [API Reference](docs/API.md)
- [Plano de Implementação](docs/IMPLEMENTATION_PLAN.md)

## 💰 Modelo de Negócio

### Mensalidade
| Porte | Valor |
|-------|-------|
| Pequeno | R$ 29/mês |
| Médio/Grande | R$ 49/mês |

### Comissões
| Tipo | Taxa |
|------|------|
| Avulso | 8% |
| Assinatura | 6% |

## 🛠️ Stack

| Componente | Tecnologia |
|------------|------------|
| Mobile | React Native + Expo |
| Web Admin | Next.js 15 |
| Backend | FastAPI (Python) |
| Database | PostgreSQL |
| Cache | Redis |
| Pagamentos | Stripe |
| Deploy | Railway + Vercel |

## 📝 License

Proprietary - All rights reserved.
