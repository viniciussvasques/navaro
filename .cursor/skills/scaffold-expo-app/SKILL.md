---
name: scaffold-expo-app
description: Scaffold app Expo no monorepo DUNNAA (cliente ou barbeiro). Use ao criar apps/cliente, apps/barbeiro ou configurar app mobile do zero.
---

# Scaffold App Expo — DUNNAA

## Pré-requisitos

- Node 20+, pnpm 9+
- `packages/shared` criado (tipos API)

## Passo 1 — Criar app

```bash
cd apps
npx create-expo-app@latest cliente --template tabs
# ou barbeiro para DUNNAA Pro
```

## Passo 2 — package.json

```json
{
  "name": "@DUNNAA/cliente",
  "scripts": {
    "dev": "expo start",
    "build": "echo 'use EAS build'",
    "lint": "eslint ."
  },
  "dependencies": {
    "@DUNNAA/shared": "workspace:*"
  }
}
```

## Passo 3 — API client

`services/api.ts`:

```typescript
const BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getStoredToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) throw new ApiError(res.status, await res.json());
  return res.json();
}
```

## Passo 4 — Env

`.env`:

```
EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## Passo 5 — Estrutura de telas (MVP)

```
app/
├── (auth)/
│   ├── login.tsx        # SMS send-code + verify
│   └── _layout.tsx
├── (tabs)/
│   ├── index.tsx        # busca establishments
│   ├── appointments.tsx
│   ├── queue.tsx
│   └── profile.tsx
└── _layout.tsx
```

## Passo 6 — Integrar monorepo

```bash
cd ../..   # raiz DUNNAA
pnpm install
pnpm dev:cliente
```

## Passo 7 — Validar

- [ ] App inicia com `pnpm dev:cliente`
- [ ] API health: `GET /health`
- [ ] Auth flow conecta ao backend local

Referência de endpoints: `docs/API.md`, `docs/FEATURES.md`.
