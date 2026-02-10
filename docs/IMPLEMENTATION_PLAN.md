# 📋 DUNNAA - Plano de Implementação

## Visão Geral

Este documento define o plano de implementação do MVP 1.0 do DUNNAA.

---

## Fase 1: Setup do Projeto (Semana 1)

### 1.1 Estrutura Monorepo
- [x] Configurar Turborepo
- [ ] Setup apps/cliente (Expo)
- [ ] Setup apps/barbeiro (Expo)
- [ ] Setup apps/estabelecimento-web (Next.js)
- [ ] Setup apps/admin (Next.js)
- [ ] Setup packages/api (FastAPI)
- [ ] Setup packages/database (SQLAlchemy)
- [ ] Setup packages/shared (tipos TS)

### 1.2 Configurações Base
- [ ] ESLint + Prettier (TS)
- [ ] Ruff + Black (Python)
- [ ] Husky pre-commit hooks
- [ ] GitHub Actions CI

### 1.3 Database
- [ ] Docker Compose (Postgres + Redis)
- [ ] Alembic setup
- [ ] Models base
- [ ] Migration inicial

---

## Fase 2: Backend Core (Semanas 2-3)

### 2.1 Auth
- [x] Endpoint send-code
- [x] Endpoint verify
- [x] JWT + Refresh tokens
- [x] Middleware de auth
- [ ] Twilio/WhatsApp/SMS real (OTP em Redis para produção)

### 2.2 Users
- [x] CRUD usuários
- [ ] Upload avatar (R2)
- [x] Roles e permissões (owner/admin/staff)

### 2.3 Establishments
- [x] CRUD estabelecimentos
- [x] Upload logo/cover
- [x] Horários de funcionamento
- [x] Validações de negócio

### 2.4 Services & Staff
- [x] CRUD serviços
- [x] CRUD funcionários
- [x] Vínculo serviço-funcionário
- [x] Agenda de trabalho

---

## Fase 3: Agendamento (Semana 4)

### 3.1 Disponibilidade
- [x] Calcular slots disponíveis
- [x] Considerar duração do serviço
- [x] Considerar agenda funcionário (com fallback horário estabelecimento)
- [x] Considerar horário estabelecimento

### 3.2 Appointments
- [x] CRUD agendamentos
- [x] Validações de conflito
- [x] Status transitions
- [x] Notificações push

---

## Fase 4: Assinaturas (Semanas 5-6)

### 4.1 Planos
- [x] CRUD planos (products/bundles)
- [x] Vincular serviços
- [x] Limites semanais/diários

### 4.2 Subscriptions
- [x] Stripe (e Mercado Pago) setup
- [x] Criar assinatura
- [x] Renovação automática
- [x] Cancelamento
- [x] Controle de uso

### 4.3 Check-in
- [x] Gerar QR code JWT (owner/admin/staff)
- [x] Validar check-in
- [x] Consumir crédito
- [ ] Anti-fraude (1/dia) — reforçar se necessário

---

## Fase 5: Pagamentos (Semana 6)

### 5.1 Pagamento Avulso
- [x] Create payment intent
- [x] Confirm payment
- [x] Webhooks Stripe
- [x] Split automático

### 5.2 Repasses
- [x] Calcular líquido / payouts
- [x] Agendar payout
- [x] Histórico de repasses (endpoint payouts)

---

## Backend — o que ainda falta (pendências)

A API já cobre a maior parte do MVP (auth, establishments, services, staff, appointments, queue, check-ins, subscriptions, payments, payouts, reviews, favorites, portfolio, notifications, analytics). O que falta é principalmente **endurecer para produção** e **observabilidade**. Ver detalhes em [BACKEND_REVIEW.md](BACKEND_REVIEW.md).

| Prioridade | Item | Status |
|------------|------|--------|
| Alta | **Config única** — unificar `app.config` e `app.core.config` | Pendente |
| Alta | **Auth/OTP produção** — persistir OTP em Redis, SMS real, remover bypass debug | Pendente |
| Alta | **CI estável** — fixtures async, smoke tests por domínio (auth, appointments, queue, check-ins) | Pendente |
| Alta | **RBAC** — matriz de permissões por endpoint, testes 200/403 por perfil | Pendente |
| Média | **Observabilidade** — request_id, user_id em logs; métricas 4xx/5xx; trilha auditoria (fila, pagamentos, check-in) | Pendente |
| Média | **Upload avatar (R2)** — endpoint e storage | Pendente |

---

## Fase 6: Apps Mobile (Semanas 7-10)

### 6.1 App Cliente
- [ ] Screens de auth
- [ ] Home + busca
- [ ] Detalhes estabelecimento
- [ ] Fluxo de agendamento
- [ ] Fluxo de assinatura
- [ ] Scanner QR check-in
- [ ] Histórico
- [ ] Perfil

### 6.2 App Barbeiro (mobile)
- [ ] Screens de auth
- [ ] Cadastro estabelecimento
- [ ] Dashboard
- [ ] Gestão serviços
- [ ] Gestão funcionários
- [ ] Gestão planos
- [ ] Agenda
- [ ] Gerar QR check-in
- [ ] Assinantes
- [ ] Financeiro

### 6.3 App Web Estabelecimento (DUNNAA Pro Web)
- [ ] Setup Next.js em apps/estabelecimento-web
- [ ] Auth (login/cadastro) reutilizando API do app barbeiro
- [ ] Dashboard (métricas, agenda do dia)
- [ ] Gestão serviços, funcionários, pacotes, planos
- [ ] Agenda (visualização e bloqueios)
- [ ] Modo fila, check-in (QR), avaliações
- [ ] Financeiro e relatórios
- [ ] Layout responsivo (desktop/tablet)

---

## Fase 7: Admin Web (Semana 11)

### 7.1 Dashboard
- [ ] Métricas gerais
- [ ] Gráficos

### 7.2 CRUD Pages
- [ ] Estabelecimentos
- [ ] Usuários
- [ ] Assinaturas
- [ ] Pagamentos

### 7.3 Financeiro
- [ ] Relatório comissões
- [ ] Repasses

---

## Fase 8: Testes & Deploy (Semana 12)

### 8.1 Testes
- [ ] Unit tests backend (80%)
- [ ] Integration tests API
- [ ] E2E tests críticos

### 8.2 Deploy
- [ ] Railway (API + DB)
- [ ] Vercel (Admin)
- [ ] EAS Build (Apps)
- [ ] Configurar domínios

### 8.3 Monitoramento
- [ ] Sentry (errors)
- [ ] Logs estruturados
- [ ] Métricas básicas

---

## Critérios de Aceite MVP 1.0

### Funcional
- [ ] Cliente pode buscar e ver estabelecimentos
- [ ] Cliente pode agendar e pagar avulso
- [ ] Cliente pode assinar plano
- [ ] Cliente pode fazer check-in via QR
- [ ] Barbeiro pode gerenciar serviços/funcionários
- [ ] Barbeiro pode criar planos
- [ ] Barbeiro pode ver agenda
- [ ] Barbeiro pode gerar QR de check-in
- [ ] Admin pode ver métricas e gerenciar

### Técnico
- [ ] API respondendo < 500ms p95
- [ ] Cobertura testes > 70%
- [ ] Zero erros críticos em prod
- [ ] Logs e monitoramento funcionando

---

## Estimativa Total

| Fase | Duração |
|------|---------|
| Setup | 1 semana |
| Backend Core | 2 semanas |
| Agendamento | 1 semana |
| Assinaturas | 2 semanas |
| Pagamentos | 1 semana |
| Apps Mobile | 4 semanas |
| App Web Estabelecimento | 1–2 semanas |
| Admin Web | 1 semana |
| Testes & Deploy | 1 semana |
| **Total** | **14–15 semanas** |

---

*Última atualização: Fevereiro 2026*
