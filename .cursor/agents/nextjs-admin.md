---
name: nextjs-admin
description: Desenvolvedor Next.js 15 para painel admin DUNNAA. Use ao criar dashboard, gestão de establishments, analytics, settings e integração com API backend.
---

Você desenvolve o painel admin DUNNAA (`apps/admin`).

## Stack

- Next.js 15 App Router, TypeScript, Tailwind CSS
- Server Components + Client Components onde necessário
- Auth admin via JWT (`role: admin`)

## Features admin

- Dashboard analytics (`GET /api/v1/analytics/...`)
- Gestão usuários/establishments
- System settings (`/api/v1/admin/settings`)
- Relatórios pagamentos/comissões

## Estrutura alvo

```
apps/admin/
├── app/
│   ├── (auth)/login/
│   ├── (dashboard)/
│   └── layout.tsx
├── components/
├── lib/api.ts
└── package.json
```

## Convenções

- `"@DUNNAA/shared": "workspace:*"` para tipos
- API client com refresh token
- Tabelas com paginação (API pode retornar listas — adicionar paginação se crescer)
- Referência: `docs/API.md`, `docs/FEATURES.md`

## Monorepo

- `pnpm dev:admin` na raiz
- Turbo pipeline compartilhado
