# INSTRUCTIONS — Retomada do projeto DUNNAA (Navaro)

> Guia prático para desenvolvedores e agentes AI.  
> Projeto: `/root/projetos/navaro` no VPS `173.212.248.236`

---

## 1. Objetivo

Consolidar o codebase **Navaro** como **DUNNAA** oficial:

- Manter apps completos (cliente, pro, admin, site, WhatsApp)
- Eliminar vestígios do nome Navaro
- Melhorar qualidade (testes, CI, docs)
- Colocar em produção em `dunnaa.com.br`

---

## 2. O que NÃO fazer

- ❌ Não usar `/opt/Dunnaa` (deploy mínimo removido)
- ❌ Não commitar `.env`, tokens, chaves SSH
- ❌ Não sobrescrever `authorized_keys` do servidor sem backup
- ❌ Não fazer rename massivo sem rodar testes entre cada lote

---

## 3. Setup local / servidor

```bash
cd /root/projetos/navaro

# Infra
docker compose up -d --build

# Migrations
docker compose exec api alembic upgrade head

# Logs
docker compose logs -f api
```

### Domínios (Traefik)

| URL | Serviço compose |
|-----|-----------------|
| https://api.dunnaa.com.br | `api` |
| https://admin.dunnaa.com.br | `admin` |
| https://pro.dunnaa.com.br | `pro` |
| https://dunnaa.com.br | `website` |

### Scripts pnpm (raiz)

```bash
pnpm dev:api          # API local
pnpm dev:admin        # packages/web-admin
pnpm dev:pro          # packages/dunnaa-pro-web
pnpm dev:website      # packages/website
pnpm dev:cliente      # packages/app-customer
pnpm dev:barbeiro     # packages/app-pro
```

---

## 4. Plano de rename Navaro → DUNNAA

### 4.1 Git

```bash
# REMOVER token da URL (urgente — revogar no GitHub)
git remote -v
git remote set-url origin git@github.com:innexardev/Dunnaa.git
# ou manter viniciussvasques/navaro até migrar
```

### 4.2 Código — ordem sugerida

1. **Redis prefix:** `navaro:` → `dunnaa:` (buscar em `packages/api`)
2. **Variáveis de ambiente** e `docker-compose.yml`
3. **Comentários e docs** (README desatualizado)
4. **Testes** que assertam prefixo navaro
5. **Pasta do projeto** (opcional): `navaro` → `dunnaa`

### 4.3 Comando de busca

```bash
cd /root/projetos/navaro
rg -i navaro --glob '!node_modules' --glob '!.git' --glob '!pnpm-lock.yaml'
```

Revisar cada ocorrência — nem tudo deve ser renomeado (ex.: histórico git, URLs externas).

---

## 5. Prioridades de melhoria (30 dias)

### Semana 1 — Estabilização

- [ ] Subir docker compose e validar health
- [ ] Corrigir Git remote + secrets
- [ ] CI: pytest + ruff verde
- [ ] Atualizar README com estrutura `packages/*`

### Semana 2 — Rename + auth

- [ ] Redis prefix dunnaa
- [ ] OTP/SMS produção (nVoIP)
- [ ] Testes auth e RBAC

### Semana 3 — Merge innexardev

- [ ] Cherry-pick testes/fixes do repo `innexardev/Dunnaa`
- [ ] Staff link, categorias, tips se faltarem
- [ ] Avaliar criar `packages/shared`

### Semana 4 — Frontends

- [ ] App cliente: fluxo agendar + fila (ver `docs/APP_CLIENTE_PLANO.md`)
- [ ] Pro Web: itens de `docs/PRO_WEB_REVIEW.md`
- [ ] Admin: gaps em `docs/ADMIN_BACKEND_GAPS.md`

---

## 6. Estrutura de pastas (referência)

| Caminho | Função |
|---------|--------|
| `packages/api/app/api/v1/` | Rotas REST |
| `packages/api/app/services/` | Lógica de negócio |
| `packages/api/app/models/` | SQLAlchemy |
| `packages/api/tests/` | Pytest |
| `packages/web-admin/` | Admin Next.js |
| `packages/dunnaa-pro-web/` | Pro Web |
| `packages/website/` | Landing |
| `packages/app-customer/` | Expo cliente |
| `packages/app-pro/` | Expo pro |
| `packages/whatsapp-bridge/` | Bridge WhatsApp |
| `docs/` | Documentação |
| `.cursor/` | Rules/agents Cursor |

---

## 7. Testes

```bash
cd packages/api
pytest tests/ -v
ruff check .
ruff format --check .
```

---

## 8. Cursor / Agentes AI

- Ler `AGENTS.md` antes de codar
- Rules em `.cursor/rules/` aplicam por glob
- Agents: `@backend-api`, `@expo-mobile`, `@nextjs-admin`
- Blueprint completo: `docs/BLUEPRINT.md`

---

## 9. Contatos e infra

| Item | Valor |
|------|-------|
| VPS | `173.212.248.236` (ssh alias: `vps`) |
| Traefik network | `fixelo_fixelo-network` |
| Projeto | `/root/projetos/navaro` |

---

## 10. Checklist antes de cada deploy

- [ ] `.env` preenchido no servidor (não no git)
- [ ] Migrations aplicadas
- [ ] Testes passando
- [ ] Domínios DNS apontando pro VPS
- [ ] Stripe/MP webhooks apontando para `api.dunnaa.com.br`

---

*Atualizado: Junho 2026 — foco Navaro/DUNNAA completo.*
