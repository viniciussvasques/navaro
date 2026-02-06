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

---

## Gaps e pendências (prioridade alta)

## 1) Configuração duplicada (`app/config.py` vs `app/core/config.py`)
**Risco:** comportamento inconsistente por usar fontes diferentes de settings.

**Ação recomendada:**
- definir `app.core.config` como fonte única;
- migrar imports gradualmente;
- descontinuar `app.config` com plano de remoção.

## 2) Fluxo de autenticação ainda incompleto para produção
Há uso de código de verificação em memória e TODO para envio SMS real.

**Risco:** não escala entre múltiplas instâncias e pode perder códigos em restart.

**Ação recomendada:**
- persistir OTP em Redis com TTL;
- implementar provider real de SMS;
- remover bypasss de debug fora de ambiente local.

## 3) Cobertura de testes E2E/API instável no ambiente CI
Ocorreram falhas relacionadas a loop async e ausência de dependência (`asgi_lifespan`) no ambiente local de execução.

**Ação recomendada:**
- garantir instalação de dependências de teste no pipeline;
- padronizar fixture de app/db para evitar múltiplos loops;
- adicionar smoke tests por domínio crítico (auth, appointments, queue, checkins).

## 4) Segurança e autorização ainda heterogêneas
Alguns endpoints antigos ainda usam validação owner-only mesmo onde pode existir operação de staff/admin.

**Ação recomendada:**
- definir matriz de permissões (RBAC) por endpoint;
- centralizar regras de autorização em helpers/decorators;
- adicionar testes de autorização (200/403/404) por perfil.

## 5) Observabilidade limitada para operação em produção
Falta padronização de métricas e trilhas de auditoria por operação sensível.

**Ação recomendada:**
- registrar `request_id`, `user_id`, `establishment_id` em logs estruturados;
- criar métricas para erros 4xx/5xx por endpoint;
- adicionar trilha de auditoria para mudanças críticas (fila, pagamentos, check-in).

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
