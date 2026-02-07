# Revisão Técnica do Backend (API)

## Objetivo
Este documento consolida:
- o que já foi corrigido recentemente no backend;
- os principais gaps ainda abertos;
- um plano prático para levar a API a um nível mais profissional de segurança, confiabilidade e manutenção.

---

## O que já foi feito (últimas mudanças)

### 1) Autorização mais completa por estabelecimento
Foi adicionada validação de acesso por estabelecimento que permite:
- dono (owner),
- admin,
- staff ativo vinculado ao estabelecimento.

Isso melhorou endpoints que antes eram estritamente owner-only.

### 2) Fila: implementação de `/queue/my`
O endpoint de filas do usuário foi implementado com busca de entradas ativas (`waiting`, `called`, `serving`).

### 3) Fila: endurecimento no update de status
Atualização de status de fila passou a validar acesso ao estabelecimento antes de alterar registros.

### 4) Check-in QR: autorização alinhada com regra de negócio
A geração de QR de check-in passou a usar a mesma validação de acesso (owner/admin/staff ativo).

### 5) Compatibilidade de banco unificada
`app/database.py` foi transformado em camada de compatibilidade, reexportando objetos de `app.core.database` para reduzir inconsistências de engine/session.

### 6) Agendamento com fallback de jornada
Criação de agendamento passou a considerar horário do estabelecimento quando `work_schedule` do profissional estiver vazio/ausente.

### 7) Estabilização de testes e CI
Os erros de `RuntimeError` (event loop) e falhas intermitentes no CI foram resolvidos com a padronização das fixtures em `tests/conftest.py`, uso correto de `asgi_lifespan` e `NullPool` para o banco de dados em testes.

---

### 8) Unificação de Configuração
Consolidada fonte de settings em `app.core.config`, removendo `app/config.py` duplicado e ajustando todos os imports.

### 9) Autenticação Profissional (Redis/OTP)
OTP agora é armazenado no Redis com TTL de 5 minutos, removendo armazenamento em memória. Adicionado módulo de conexão Redis centralizado em `app.core.redis`.

### 10) Segurança e RBAC (Admin Support)
Padronizadas verificações de acesso (`verify_establishment_access/owner`) para incluir suporte explícito ao perfil `admin`. Corrigido endpoints de appointments para verificar permissões antes de execução.

### 11) Observabilidade Melhorada
Adicionado binding automático de `user_id` e `establishment_id` ao contexto de logs estruturados (structlog) via dependências de autenticação.

---

## Gaps e pendências (prioridade alta)
*Nenhum item crítico aberto no momento.*

---

## Backlog sugerido (30 dias)

## Semana 1 — Estabilização de base
- consolidar settings em `core.config`;
- ajustar imports legados;
- validar startup em todos os ambientes.

## Semana 2 — Auth/OTP profissional
- Redis para OTP com TTL e limite de tentativas;
- integração SMS provider;
- testes de expiração, repetição e rate limit.

## Semana 3 — Segurança e RBAC
- padronizar autorização por recurso;
- cobrir endpoints com testes de permissão por papel.

## Semana 4 — Qualidade operacional
- métricas e logs de negócio;
- checklist de readiness para produção;
- execução da suíte completa em CI com cobertura mínima.

---

## Última execução de testes (pytest)

- **87 testes** — todos passando.
- **Cobertura:** ~61% (TOTAL). Módulos com 0% ou baixa: `auth_service`, `establishment_service`, `user_service`, `wallet_service`, `core/sentry`, `models/checkin`; bundles e subscriptions ~25%.
- **Correções feitas:** (1) `datetime.utcnow()` → `datetime.now(timezone.utc)` em `checkin_service`; (2) Pydantic `class Config` → `ConfigDict(from_attributes=True)` em admin_settings, establishments, services, staff, users; (3) teste do scheduler que deixava coroutine órfã ao mockar `create_task` — ajustado com mock awaitable.
- **Avisos restantes:** passlib/crypt (Python 3.13, lib externa); 1 warning em test_scheduler (AsyncMock). Sugestão: não bloquear CI por esses avisos.

---

## Critérios de pronto (Definition of Done)
Uma feature backend será considerada pronta quando:
1. tiver validação de autorização explícita;
2. possuir testes de sucesso e falha;
3. logs e erros forem observáveis;
4. passar lint/format e suíte relevante em CI.

---

## Responsáveis sugeridos
- **Backend Lead:** arquitetura, padrões e revisão final de segurança.
- **Dev Backend:** implementação e testes por domínio.
- **DevOps/Plataforma:** pipeline, dependências de teste e observabilidade.

---

## Observações finais
Este documento é um snapshot técnico do estado atual. Deve ser revisado ao final de cada sprint com:
- itens concluídos,
- riscos novos,
- ajustes de prioridade.
