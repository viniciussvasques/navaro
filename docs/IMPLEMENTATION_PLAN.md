# 📋 Navaro - Plano de Implementação

## Visão Geral

Este documento define o plano de implementação do MVP 1.0 do Navaro.

---

## Fase 1: Setup do Projeto (Semana 1)

### 1.1 Estrutura Monorepo
- [x] Configurar Turborepo
- [ ] Setup apps/cliente (Expo)
- [ ] Setup apps/barbeiro (Expo)
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
- [ ] Endpoint send-code
- [ ] Endpoint verify
- [ ] JWT + Refresh tokens
- [ ] Middleware de auth
- [ ] Twilio/WhatsApp integration

### 2.2 Users
- [ ] CRUD usuários
- [ ] Upload avatar (R2)
- [ ] Roles e permissões

### 2.3 Establishments
- [ ] CRUD estabelecimentos
- [ ] Upload logo/cover
- [ ] Horários de funcionamento
- [ ] Validações de negócio

### 2.4 Services & Staff
- [ ] CRUD serviços
- [ ] CRUD funcionários
- [ ] Vínculo serviço-funcionário
- [ ] Agenda de trabalho

---

## Fase 3: Agendamento (Semana 4)

### 3.1 Disponibilidade
- [ ] Calcular slots disponíveis
- [ ] Considerar duração do serviço
- [ ] Considerar agenda funcionário
- [ ] Considerar horário estabelecimento

### 3.2 Appointments
- [ ] CRUD agendamentos
- [ ] Validações de conflito
- [ ] Status transitions
- [ ] Notificações push

---

## Fase 4: Assinaturas (Semanas 5-6)

### 4.1 Planos
- [ ] CRUD planos
- [ ] Vincular serviços
- [ ] Limites semanais/diários

### 4.2 Subscriptions
- [ ] Stripe Connect setup
- [ ] Criar assinatura
- [ ] Renovação automática
- [ ] Cancelamento
- [ ] Controle de uso

### 4.3 Check-in
- [ ] Gerar QR code JWT
- [ ] Validar check-in
- [ ] Consumir crédito
- [ ] Anti-fraude (1/dia)

---

## Fase 5: Pagamentos (Semana 6)

### 5.1 Pagamento Avulso
- [ ] Create payment intent
- [ ] Confirm payment
- [ ] Webhooks Stripe
- [ ] Split automático

### 5.2 Repasses
- [ ] Calcular líquido
- [ ] Agendar payout
- [ ] Histórico de repasses

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

### 6.2 App Barbeiro
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
| Admin Web | 1 semana |
| Testes & Deploy | 1 semana |
| **Total** | **13 semanas** |

---

*Última atualização: Fevereiro 2026*
