# DUNNAA — Revisão do sistema e roadmap (Cliente Web/iPhone + Pro Android)

> Junho 2026 · Monorepo `/root/projetos/navaro`  
> Objetivo: app **cliente no navegador** (iPhone + web) e **DUNNAA Pro Android** em produção.

---

## 1. Mapa do sistema hoje

| Produto | Pacote | Status | Produção |
|---------|--------|--------|----------|
| API | `packages/api` | ✅ Principal | `api.dunnaa.com.br` |
| Admin | `packages/web-admin` | ✅ | `admin.dunnaa.com.br` |
| Pro Web | `packages/dunnaa-pro-web` | ✅ (build prod) | `pro.dunnaa.com.br` |
| Site | `packages/website` | ✅ | `dunnaa.com.br` |
| WhatsApp | `packages/whatsapp-bridge` | ✅ | interno :3100 |
| **App cliente** | `packages/app-customer` | 🔄 MVP+ Android | APK sideload |
| **App Pro mobile** | `packages/app-pro` | 🔄 ~50% web | **não publicado** |
| `packages/shared` | — | ❌ pendente | tipos duplicados |

### O que já funciona bem

- Backend completo: auth OTP, agenda, fila, pagamentos MP/PIX, assinaturas, reviews, admin
- Pro Web: 15+ módulos (agenda, fila, financeiro, settings, etc.)
- App cliente Android: fluxo busca → agendar → PIX/fila/QR, auto-update APK via site
- Site: landing, `/go/{slug}` QR, download APK, hero/branding

### Dívida transversal

| Item | Impacto |
|------|---------|
| Rename `navaro` → `dunnaa` (Redis, logs) | Médio |
| Sem `packages/shared` | Tipos duplicados web/mobile |
| Sem App Store / Play Store | iPhone sem app nativo; distribuição manual |
| `version.json` desatualizado vs app 1.0.2 | Auto-update inconsistente |
| Website em `next dev` + volume | Instável em prod (considerar build prod) |

---

## 2. Objetivos deste roadmap

### A) Cliente no navegador (prioridade iPhone)

Usuários **sem app iOS** precisam:

1. Escanear QR do estabelecimento → **continuar no Safari**
2. Buscar, ver perfil, agendar, pagar PIX, entrar na fila
3. Instalar como **PWA** (“Adicionar à Tela de Início”)

### B) DUNNAA Pro Android

Profissionais precisam app nativo com:

1. Paridade mínima com Pro Web no dia a dia (agenda, fila, check-in)
2. APK ou Play Store
3. Mesma API e branding DUNNAA Pro

---

## 3. Trilha A — App cliente web / iPhone (PWA)

### Situação atual

- `app-customer` roda `expo start --web` mas **não há PWA** (sem manifest, sem service worker)
- `/go/{slug}` no site é landing de instalação, **não** fluxo de agendamento
- iOS: bundle configurado, **sem pipeline de build** (sem TestFlight/App Store)

### Decisão recomendada: **Expo Web + PWA** (reutilizar `app-customer`)

| Critério | Expo Web PWA | Next.js separado (`app.dunnaa.com.br`) |
|----------|--------------|----------------------------------------|
| Reuso de código | ✅ ~95% do app existente | ❌ reescrever telas |
| Time to market | 3–5 semanas | 8–12 semanas |
| Manutenção | 1 codebase mobile+web | 2 codebases |
| Performance iPhone | Boa com PWA | Melhor controle SSR |
| Maps / câmera web | Limitações conhecidas | Mesmas limitações |

**Alternativa híbrida (fase 1 rápida):** melhorar `/go/{slug}` com botão **“Continuar no navegador”** → deep link para `https://dunnaa.com.br/app/...` servindo Expo export estático.

### Escopo PWA — MVP navegador

| Feature | Incluir MVP web | Notas |
|---------|-----------------|-------|
| Login OTP WhatsApp | ✅ | Já existe |
| Busca + geo | ✅ | Fallback cidade se negar GPS |
| Perfil estabelecimento | ✅ | |
| Agendar (serviço → staff → hora) | ✅ | |
| PIX / pagar no local | ✅ | |
| Fila + QR | ✅ parcial | Câmera via `getUserMedia` |
| Push notifications | ⚠️ iOS PWA limitado | Email/WhatsApp como fallback |
| Mapa | ⚠️ simplificado | Lista-first no Safari |
| Favoritos, wallet, assinaturas | Fase 2 | |

### Tarefas técnicas — Trilha A

#### Fase A1 — Fundação (1 semana)

- [x] `app.json`: bloco `web` com PWA (`name`, `shortName`, `themeColor`, `backgroundColor`, `display: standalone`)
- [x] Build: `expo export --platform web` + script `pnpm build:customer-web`
- [x] Hospedagem: **`dunnaa.com.br/app`** (static export em `website/public/app/`)
- [x] Corrigir API URL no site (`api.dunnaa.com.br`, não `api.dunnaa.app`)

#### Fase A2 — QR → navegador (3–5 dias)

- [x] `/go/[slug]`: botão **Continuar no navegador** → `/app/establishment/{id}?from=qr`
- [x] Botão **Baixar Android** mantém APK sideload
- [x] iPhone: instruções “Adicionar à Tela de Início”
- [ ] Universal Links / `apple-app-site-association` (futuro app nativo iOS)

#### Fase A3 — Ajustes web/iPhone (1–2 semanas)

- [ ] Telas responsivas (safe area, teclado, bottom nav)
- [ ] Substituir módulos nativos-only por web shims (`expo-camera` → web QR lib)
- [ ] Geolocalização: `navigator.geolocation` (já parcial via Expo)
- [ ] Testes Safari iOS 17+ (PWA install, PIX redirect, OTP)
- [ ] SEO/robots: `noindex` em áreas autenticadas

#### Fase A4 — iPhone nativo (opcional, paralelo)

- [ ] EAS profile `production-ios`
- [ ] TestFlight → App Store
- [ ] Até lá: **PWA é canal principal iPhone**

### Métricas de sucesso — Trilha A

- QR scan → agendamento concluído **100% no Safari** (sem pedir APK)
- Lighthouse PWA score ≥ 80
- Tempo de carregamento first paint < 3s em 4G

---

## 4. Trilha B — DUNNAA Pro Android

### Situação atual (`packages/app-pro`)

| Item | Status |
|------|--------|
| Telas | ~15 (dashboard, agenda, fila, destaque, finance lite, settings lite) |
| API | Axios direto → `api.dunnaa.com.br` |
| Paridade Pro Web | ~50% — faltam check-in, QR, produtos, assinaturas, reviews, payouts |
| Build | ❌ sem `eas.json`, sem assets, sem scripts |
| Bugs conhecidos | staff phone hardcoded; `colors.successDark` ausente; sem onboarding |

### Paridade mínima v1 Android (obrigatório antes de publicar)

| Módulo | Pro Web | Pro Android v1 |
|--------|---------|----------------|
| Login OTP + email | ✅ | OTP ✅ / email ❌ |
| Onboarding estabelecimento | ✅ | ❌ → **implementar** |
| Dashboard | ✅ | ✅ expandir |
| Agenda | ✅ | ✅ |
| Fila | ✅ | ✅ expandir (chamar próximo) |
| Check-in | ✅ | ❌ → **implementar** |
| QR Code | ✅ | ❌ → **implementar** |
| Serviços | ✅ | parcial → editar/excluir |
| Financeiro (saldo/saque) | ✅ | ❌ → **implementar** |
| Configurações (PIX, horários) | ✅ | mínimo → expandir |
| Notificações push | web list | ❌ → Expo push |

### Tarefas técnicas — Trilha B

#### Fase B1 — Build pipeline (1 semana)

- [x] Copiar padrão de `app-customer`: `eas.json`, assets (icon, splash, adaptive)
- [x] `app.json`: versionCode, permissions (camera para QR)
- [x] Script `scripts/build-pro-apk-local.sh`
- [x] Root: `pnpm dev:app-pro`, `pnpm build:pro-apk:local`

#### Fase B2 — Fluxos críticos (2 semanas)

- [ ] Onboarding + escolha estabelecimento (portar de pro-web)
- [ ] Check-in + QR scanner (`expo-camera`)
- [ ] Financeiro: `/payouts/.../balance`, solicitar saque
- [ ] Settings: horários, endereço, PIX (PATCH establishment)
- [ ] Corrigir bugs theme/staff/safe area

#### Fase B3 — Paridade operacional (2–3 semanas)

- [ ] Produtos, assinaturas, reviews (leitura + ações básicas)
- [ ] Push notifications (registrar token → API)
- [ ] Offline cache agenda do dia (AsyncStorage)
- [ ] TanStack Query + tipos de `@dunnaa/shared` (quando existir)

#### Fase B4 — Distribuição

- [ ] **Interno:** APK sideload (como cliente) ou Firebase App Distribution
- [ ] **Play Store:** conta developer, listing, política privacidade
- [ ] Auto-update: reutilizar padrão `useAppUpdate` + `version.json` Pro

### Métricas de sucesso — Trilha B

- Barbearia usa **só o app** por 1 dia completo (agenda + fila + check-in)
- APK release assinado, instalável Android 10+
- 0 crashes críticos em fluxo login → fila → chamar cliente

---

## 5. Infraestrutura compartilhada (ambas trilhas)

| Tarefa | Prioridade | Responsável |
|--------|------------|-------------|
| Criar `packages/shared` (tipos API, enums) | Alta | Backend + mobile |
| `pnpm install` na raiz (CI + dev) | Alta | DevOps |
| Website production build (não `next dev`) | Média | Infra |
| Sincronizar `version.json` cliente/pro | Média | Release |
| Purge cache Cloudflare após deploy | Média | Ops |
| Testes E2E smoke (API + login OTP) | Média | QA |

---

## 6. Cronograma sugerido (12 semanas)

```
Semana 1–2   │ A1 PWA fundação + QR "continuar no navegador"
             │ B1 Pro Android build pipeline + assets
Semana 3–4   │ A2/A3 PWA Safari polish + hospedagem app.dunnaa.com.br
             │ B2 Pro fluxos críticos (onboarding, check-in, finance)
Semana 5–6   │ A3 testes iPhone PWA em produção
             │ B3 paridade operacional Pro
Semana 7–8   │ packages/shared v1 + refator tipos
             │ B4 APK Pro beta interno
Semana 9–10  │ Play Store prep (cliente Android já existe; Pro novo)
             │ iOS TestFlight (opcional)
Semana 11–12 │ Hardening, docs, monitoramento, rename navaro final
```

---

## 7. Ordem de execução imediata (próximos 7 dias)

1. **PWA:** configurar manifest + export web do `app-customer`
2. **Site `/go/[slug]`:** botão “Continuar no navegador”
3. **Pro Android:** `eas.json` + assets + primeiro APK debug
4. **Sync:** `version.json` + API URL consistente no website
5. **`packages/shared`:** scaffold mínimo (User, Establishment, Appointment)

---

## 8. Riscos

| Risco | Mitigação |
|-------|-----------|
| PWA iOS sem push | WhatsApp OTP + SMS lembretes |
| Expo web bundle grande | Code splitting, lazy routes |
| Duplicação web/mobile | `shared` + OpenAPI codegen |
| Pro mobile atrás do web | Web = fonte da verdade; mobile consome mesmos endpoints |
| SVG logo pesado (2.9MB) | Otimizar com SVGOMG antes de PWA |

---

## 9. Documentos relacionados

- [APP_CLIENTE_PLANO.md](./APP_CLIENTE_PLANO.md) — fluxos cliente MVP/Fase 2
- [DUNNAA_PRO_PLAN.md](./DUNNAA_PRO_PLAN.md) — design system Pro
- [BLUEPRINT.md](./BLUEPRINT.md) — visão geral monorepo
- [PRO_WEB_REVIEW.md](./PRO_WEB_REVIEW.md) — estado Pro Web

---

## 10. Decisões pendentes (product)

- [ ] URL PWA: `app.dunnaa.com.br` vs `dunnaa.com.br/app`
- [ ] Pro Android: sideload primeiro ou Play Store direto
- [ ] iPhone longo prazo: PWA only vs investir App Store
- [ ] Unificar login cliente web com deep link do QR
