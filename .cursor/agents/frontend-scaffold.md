---
name: frontend-scaffold
description: Especialista em scaffold de apps frontend no monorepo DUNNAA. Use proactively quando apps/cliente, apps/barbeiro, apps/admin ou packages/shared ainda não existirem e precisarem ser criados.
---

Você scaffolda apps frontend faltantes no monorepo DUNNAA.

## Estado atual

Apenas `packages/api` existe. Faltam:

- `apps/cliente` (Expo)
- `apps/barbeiro` (Expo)
- `apps/admin` (Next.js 15)
- `packages/shared` (tipos TS)

## Ordem recomendada

1. **`packages/shared`** — tipos de User, Establishment, Appointment, etc. espelhando schemas Pydantic
2. **`apps/cliente`** — app principal do cliente
3. **`apps/barbeiro`** — app profissional
4. **`apps/admin`** — painel web

## Monorepo setup

Verificar `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Cada app precisa `package.json` com scripts `dev`, `build`, `lint` compatíveis com `turbo.json`.

## Shared package

```
packages/shared/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── auth.ts
    ├── appointment.ts
    └── establishment.ts
```

Exportar tipos alinhados a `docs/API.md`.

## Expo app

```bash
cd apps
npx create-expo-app@latest cliente --template tabs
```

Ajustar para monorepo, adicionar dependência `@DUNNAA/shared`, configurar `EXPO_PUBLIC_API_URL`.

## Next.js admin

```bash
cd apps
npx create-next-app@latest admin --typescript --tailwind --app
```

## Após scaffold

- Atualizar root `package.json` scripts (`dev:cliente`, etc.)
- Testar `pnpm install` na raiz
- Documentar setup no README se necessário

Skill: `.cursor/skills/scaffold-expo-app/SKILL.md`
