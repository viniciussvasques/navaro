# Cursor — Configuração DUNNAA (Navaro)

Configuração de agentes, rules, skills e commands para o monorepo **DUNNAA** em `/root/projetos/navaro`.

| Item | Valor |
|------|-------|
| App | **DUNNAA** / **DUNNAA Pro** |
| Domínio | **dunnaa.com.br** |
| API | `https://api.dunnaa.com.br/api/v1` |
| Admin | `packages/web-admin` |
| Pro Web | `packages/dunnaa-pro-web` |

## Estrutura real

```
packages/api              # FastAPI
packages/web-admin        # Admin Next.js
packages/dunnaa-pro-web   # Pro Web
packages/website          # Site
packages/app-customer     # Expo cliente
packages/app-pro          # Expo pro
packages/whatsapp-bridge  # WhatsApp
```

Ver `docs/BLUEPRINT.md` e `INSTRUCTIONS.md` na raiz.

## Agents

| Agent | Quando usar |
|-------|-------------|
| `backend-api` | Endpoints FastAPI |
| `backend-debugger` | Testes / bugs async |
| `expo-mobile` | app-customer / app-pro |
| `nextjs-admin` | web-admin, pro-web, website |
| `migration` | Alembic |
