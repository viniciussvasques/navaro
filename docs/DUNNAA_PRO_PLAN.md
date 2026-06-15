# 📋 Dunnaa Pro – Plano Detalhado (Web + App Mobile)

> Plano de produto, design system, páginas, fluxos, componentes e animações para **Dunnaa Pro Web** (Next.js) e **Dunnaa Pro Mobile** (Expo/React Native).  
> Base: [FEATURES.md](FEATURES.md), [brand_guidelines.md](brand_guidelines.md), [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 1. Visão e escopo

### 1.1 O que é o Dunnaa Pro

- **Público:** donos e equipe de estabelecimentos (barbearias, salões).
- **Objetivo:** gestão do dia a dia: agenda, fila, serviços, funcionários, financeiro, avaliações, check-in.
- **Plataformas:**
  - **Dunnaa Pro Web** – uso em desktop/tablet no estabelecimento (Next.js, responsivo).
  - **Dunnaa Pro Mobile** – uso em celular (Expo/React Native), mesma API.

### 1.2 Princípios de produto

- **Pro primeiro:** telas densas, ações rápidas, menos “descoberta” e mais “execução”.
- **Consistência:** mesma API, mesmas regras de negócio e roles (owner/staff) nas duas plataformas.
- **Offline-ready (mobile):** cache de agenda do dia e fila para uso com rede instável.

---

## 2. Design system (brand + Pro)

### 2.1 Paleta – Deep Ocean (já definida)

| Token | Hex | Uso em Pro |
|-------|-----|------------|
| `primary` | `#005F73` | Botões principais, abas ativas, links, ícones de ação |
| `secondary` | `#0A9396` | Botões secundários, badges, gráficos |
| `accent` | `#E9D8A6` | Destaques, ofertas, badges especiais, “novo” |
| `surface` | `#FFFFFF` (web light) / `#1A1D24` (Pro dark) | Cards, modais, fundo de conteúdo |
| `background` | `#F1F5F9` (web) / `#0F1115` (Pro dark) | Fundo da aplicação |
| `text.primary` | `#1A1A1A` (light) / `#F8FAFC` (dark) | Títulos e corpo principal |
| `text.muted` | `#64748B` | Legendas, placeholders, hint |
| `success` | `#94D2BD` | Sucesso, disponível, concluído |
| `error` | `#AE2012` | Erro, perigo, cancelado |
| `warning` | `#E9D8A6` ou tom âmbar | Avisos, pendente |

**Pro (mobile e tema escuro web):** fundo escuro (`#0F1115`), surface `#1A1D24`, texto claro. Primária e secundária mantidas; accent usada com moderação para não cansar.

### 2.2 Tipografia

- **Fonte:** Plus Jakarta Sans (Google Fonts).
- **Escala sugerida:**

| Nome | Web (rem) | Mobile (sp/px) | Peso | Uso |
|------|-----------|----------------|------|-----|
| `display` | 2.25 | 28–32 | 700 | Título da tela |
| `h1` | 1.875 | 24 | 700 | Seção |
| `h2` | 1.5 | 20 | 600 | Card title, modal title |
| `h3` | 1.25 | 18 | 600 | List item primary |
| `body` | 1 | 16 | 400 | Texto padrão |
| `bodySmall` | 0.875 | 14 | 400 | Secundário |
| `caption` | 0.75 | 12 | 400 | Labels, timestamps, hint |
| `overline` | 0.6875 | 11 | 600 | Rótulos uppercase |

### 2.3 Espaçamento e cantos

- **Grid:** 4px base. Escala: 4, 8, 12, 16, 24, 32, 48, 64.
- **Cards/containers:** `rounded-2xl` (16–20px), sombra suave (`shadow-sm` / `shadow-md`).
- **Botões:** `rounded-xl` (12px). Inputs: `rounded-xl`.
- **Glassmorphism:** apenas em overlays, bottom sheets ou barras fixas (ex.: barra de ações da fila).

### 2.4 Ícones

- **Biblioteca:** Lucide React (já usada no admin) para consistência.
- **Tamanhos:** 16 (inline), 20 (botão), 24 (header/tab), 32 (empty state).
- **Pro:** ícones “objetivos” (Calendar, Users, DollarSign, etc.), evitar estilo “casual” demais.

---

## 3. Componentes base (design system)

### 3.1 Lista mínima de componentes

| Componente | Descrição | Web | Mobile |
|------------|-----------|-----|--------|
| **Button** | Primário, secundário, outline, ghost, danger; loading, disabled | ✓ | ✓ |
| **Input** | Texto, e-mail, telefone, máscaras (CPF, etc.) | ✓ | ✓ |
| **Select / Picker** | Dropdown (web) / Picker nativo ou modal (mobile) | ✓ | ✓ |
| **Card** | Container com opcional header/footer, clickable | ✓ | ✓ |
| **Badge** | Status (pendente, concluído, cancelado), contagem | ✓ | ✓ |
| **Avatar** | Foto ou iniciais, tamanhos (sm, md, lg) | ✓ | ✓ |
| **Chip** | Filtro, tag (ex.: profissional, serviço) | ✓ | ✓ |
| **Modal / Sheet** | Modal central (web); bottom sheet (mobile) para ações | ✓ | ✓ |
| **Toast / Snackbar** | Feedback de ação (sucesso, erro) | ✓ | ✓ |
| **Skeleton** | Loading de listas e cards | ✓ | ✓ |
| **Empty state** | Ilustração + título + CTA | ✓ | ✓ |
| **Data table** | Tabela ordenável/filtrable (web); lista agrupada (mobile) | Web foco | Lista |
| **Tabs** | Abas horizontais (web e mobile) | ✓ | ✓ |
| **Bottom nav** | Navegação principal (mobile) | — | ✓ |
| **Sidebar / Drawer** | Navegação principal (web); drawer (mobile) para menu | ✓ | ✓ |
| **AppBar** | Título, ações, voltar | ✓ | ✓ |
| **FAB** | Ação principal (ex.: “Novo agendamento”) | Opcional | ✓ |
| **Date/Time picker** | Escolha de data e hora (agenda, bloqueio) | ✓ | ✓ |
| **QR display** | Exibir QR code do estabelecimento/check-in | ✓ | ✓ |

### 3.2 Estados e acessibilidade

- **Focus:** outline visível (primary ou accent) em todos os controles.
- **Loading:** spinner ou skeleton; botão com `disabled` + ícone de loading.
- **Erro:** mensagem abaixo do campo ou toast; cor `error`.
- **Contraste:** texto legível em cima de surface/background (WCAG AA onde fizer sentido).

---

## 4. Navegação e estrutura de telas

### 4.1 Dunnaa Pro Web (Next.js)

- **Layout:** sidebar fixa à esquerda (colapsável em tablet) + área de conteúdo.
- **Auth:** login (e-mail/senha ou mesmo fluxo do app) → redirecionar para dashboard.
- **Hierarquia de rotas sugerida:**

```
/ (redirect → /dashboard)
/login
/onboarding (primeiro acesso: cadastro estabelecimento)
/dashboard          → Visão do dia, resumo financeiro, próximos agendamentos
/agenda             → Agenda (dia/semana), por profissional
  /agenda/block     → Bloquear horário
/appointments       → Lista de agendamentos (filtros, status)
/queue              → Fila de espera (ver, chamar próximo, remover)
/check-in           → QR code do estabelecimento + notificações de chegada
/services           → CRUD serviços
  /services/new
  /services/[id]
/staff              → CRUD funcionários, agenda de trabalho
  /staff/new
  /staff/[id]
  /staff/[id]/schedule
/packages           → Pacotes/combos
  /packages/new
  /packages/[id]
/subscriptions      → Planos de assinatura (criar, editar, assinantes ativos)
  /subscriptions/plans
  /subscriptions/subscribers
/portfolio          → Fotos de trabalhos (upload, galeria, vincular a profissional)
/reviews            → Avaliações recebidas, responder
/finance            → Receita (dia/semana/mês), por profissional, taxas
  /finance/overview
  /finance/payouts
/settings           → Dados do estabelecimento, horário, notificações, conta
  /settings/profile
  /settings/hours
  /settings/account
```

- **Responsivo:** sidebar vira drawer em telas &lt; 1024px; tabelas com scroll horizontal ou cards em coluna em mobile.

### 4.2 Dunnaa Pro Mobile (Expo)

- **Navegação:** bottom tabs (4–5 itens) + stack por módulo.
- **Tabs sugeridas:** Início (Dashboard) | Agenda | Fila | Financeiro | Mais (menu).
- **Fluxo inicial:** splash → login → se estabelecimento incompleto, onboarding → Home.

**Stack por tab:**

- **Início:** Dashboard → [Agenda do dia, Próximos, Ações rápidas].
- **Agenda:** Lista dia/semana → Detalhe agendamento → Bloquear horário; ou Calendário.
- **Fila:** Fila atual → Chamar próximo / Remover.
- **Financeiro:** Resumo → Detalhe período / Por profissional.
- **Mais:** Menu (Serviços, Funcionários, Pacotes, Assinaturas, Portfólio, Avaliações, Check-in/QR, Configurações) → cada um com sua stack.

- **Detalhe:** telas densas (lista + ações); formulários em tela cheia ou modal.

---

## 5. Páginas e funcionalidades (detalhamento)

Cada bloco abaixo pode virar spec de tela (wireframe + estados) depois.

### 5.1 Login e onboarding

- **Login (web + mobile):** e-mail + senha; “Esqueci a senha”; opcional “Manter conectado” (web).
- **Onboarding (primeiro acesso):** passo a passo: nome do estabelecimento, categoria, endereço (ou link Maps), foto de capa, logo, horário de funcionamento. Progress indicator; salvar por passo.

### 5.2 Dashboard (Início)

- **Web:** cards em grid: “Agendamentos hoje” (número + lista resumida), “Fila agora”, “Receita hoje”, “Próximos 3 agendamentos”. Botões rápidos: Ver agenda, Ver fila, Gerar QR.
- **Mobile:** mesmo conceito em coluna; swipe ou botão para atualizar.
- **Animações:** entrada dos cards (stagger 50–80ms); número de “receita hoje” com count-up opcional.

### 5.3 Agenda

- **Vista:** dia ou semana; filtro por profissional (dropdown/chip).
- **Células:** slot com nome do cliente, serviço, horário; cor por status (confirmado, pendente, concluído, no-show, cancelado).
- **Ações:** clicar no slot → modal/drawer com detalhes + “Marcar como atendido”, “No-show”, “Cancelar”. “Bloquear horário” (escolher data/hora e profissional).
- **Web:** tabela ou calendário tipo grid; mobile: lista agrupada por dia ou calendário compacto + lista.
- **Animações:** transição ao trocar dia/semana; modal slide-up (mobile) ou fade (web).

### 5.4 Fila

- **Lista:** posição, nome do cliente, horário de entrada, tempo estimado (opcional).
- **Ações:** “Chamar próximo” (remove da fila e pode abrir check-in), “Remover da fila”.
- **Mobile:** possível notificação push para o cliente (“Sua vez em X min”).
- **Animações:** ao “chamar próximo”, item some com slide; novo item no topo com fade-in.

### 5.5 Check-in e QR

- **Tela:** exibir QR code grande (estabelecimento ou check-in); botão “Atualizar QR” se expirar.
- **Notificações:** lista de “Chegadas” (quem escaneou e está aguardando); aceitar/associar a atendimento.
- **Web:** útil em tablet na recepção; mobile como alternativa.

### 5.6 Serviços, Staff, Pacotes, Assinaturas

- **Listas:** tabela (web) ou lista com swipe actions (mobile); filtro ativo/inativo.
- **CRUD:** formulários com validação (nome, preço, duração, vínculos); salvar e voltar ou salvar e criar outro.
- **Assinaturas:** além de planos, tela “Assinantes ativos” com uso (X de Y cortes).
- **Animações:** transição entre lista e formulário; toast de sucesso ao salvar.

### 5.7 Portfólio

- **Upload:** arrastar ou selecionar; múltiplas fotos; opcional: vincular a profissional.
- **Galeria:** grid de fotos; clicar para ampliar; editar legenda ou remover.

### 5.8 Avaliações

- **Lista:** avaliações recebidas (estrelas, comentário, data, cliente/profissional).
- **Ação:** “Responder” (campo de texto + enviar); opcional “Aprovar para Google” (MVP 1.1).
- **Filtro:** por período, por profissional.

### 5.9 Financeiro

- **Resumo:** cards com receita (hoje, semana, mês); gráfico simples (barras ou linhas); avulso vs assinatura.
- **Por profissional:** breakdown de atendimentos e valor.
- **Taxas:** valor pago ao app (transparência).
- **Repasses:** lista de payouts (pendente, concluído).
- **Animações:** gráficos com entrada suave; números com count-up no resumo.

### 5.10 Configurações

- **Perfil do estabelecimento:** nome, categoria, endereço, capa, logo, horário de funcionamento.
- **Conta:** e-mail, trocar senha, notificações (lembretes, fila, etc.).
- **Integrações:** futuro (ex.: Google Calendar).
- **Sair:** logout com confirmação (opcional).

---

## 6. Animações e microinterações

### 6.1 Princípios (Pro)

- **Rápidas e objetivas:** duração 200–300ms para transições; 100–150ms para hovers.
- **Pouco “elástico”:** preferir ease-out ou ease-in-out; evitar bounce exagerado.
- **Feedback imediato:** botão com loading; lista com skeleton; toast ao salvar.

### 6.2 Catálogo sugerido

| Contexto | Animação | Duração |
|----------|----------|---------|
| Troca de rota (web) | Fade ou slide suave do conteúdo | 200–250ms |
| Abertura de modal | Fade-in + scale 98% → 100% | 200ms |
| Bottom sheet (mobile) | Slide-up da altura | 300ms |
| Lista (entrada) | Stagger dos itens (50ms entre itens) | 50ms × N |
| Botão loading | Spinner ou pulse no ícone | — |
| Toast | Slide-in (canto) + fade-in | 250ms |
| Remover item da fila | Slide-out para a esquerda + collapse | 250ms |
| Número (receita, etc.) | Count-up (opcional) | 600–800ms |
| Skeleton | Shimmer | loop |

### 6.3 Tecnologias

- **Web:** CSS transitions/animations + Framer Motion (ou React Spring) para gestos e layout animations.
- **Mobile:** Reanimated (Expo) + React Navigation (transições nativas).

---

## 7. Integração com a API

- **Base URL:** mesma API FastAPI (`/api/v1`); auth por token (Bearer).
- **Endpoints principais já existentes:** auth, establishments, services, staff, appointments, queue, check-ins, subscriptions, payments, payouts, reviews, portfolio, analytics.
- **Pro:** usar roles `owner` e `staff`; onde houver `establishment_id`, obter do usuário logado (owner) ou do vínculo staff.
- **Web e mobile:** mesma camada de serviços (fetch/axios); no mobile, considerar cache (React Query + persist) para agenda e fila.

---

## 8. Ordem de implementação sugerida

### Fase 1 – Fundação (2–3 sprints)

1. **Design system:** tokens (cores, tipografia, espaços), componentes base (Button, Input, Card, Badge, Modal, Toast, Skeleton).
2. **Auth:** login web + login mobile; persistência de token e refresh.
3. **Layout:** sidebar (web) e bottom tabs + stacks (mobile); AppBar e navegação.
4. **Dashboard:** dados mock ou API real (agendamentos do dia, resumo financeiro).

### Fase 2 – Core operacional (2–3 sprints)

5. **Agenda:** listagem dia/semana, filtro por profissional, detalhe do agendamento, marcar atendido/no-show, bloquear horário.
6. **Fila:** listar, chamar próximo, remover.
7. **Check-in / QR:** tela de QR e lista de chegadas (se a API expuser).

### Fase 3 – Cadastros e gestão (2 sprints)

8. **Serviços e Staff:** CRUD completo (web primeiro; mobile depois).
9. **Pacotes e Assinaturas:** CRUD planos e tela de assinantes.
10. **Portfólio:** upload e galeria.

### Fase 4 – Financeiro e fechamento (1–2 sprints)

11. **Financeiro:** resumo, por profissional, taxas, payouts.
12. **Avaliações:** listar e responder.
13. **Configurações:** perfil do estabelecimento, horários, conta.
14. **Onboarding:** fluxo de primeiro acesso (cadastro do estabelecimento).

### Fase 5 – Polish

15. **Animações:** aplicar catálogo nas telas principais.
16. **Empty states e erros:** ilustrações e mensagens claras.
17. **Performance e offline (mobile):** cache de agenda/fila, retry de ações.
18. **Testes:** E2E críticos (login, criar agendamento, chamar próximo na fila).

---

## 9. Checklist de entrega por tela (exemplo: Agenda)

- [ ] Layout (web responsivo + mobile) conforme design system
- [ ] Dados da API (slots, profissionais, estabelecimento)
- [ ] Filtro por profissional e troca dia/semana
- [ ] Modal/drawer de detalhe do agendamento
- [ ] Ações: marcar atendido, no-show, cancelar
- [ ] Bloquear horário (date/time picker + profissional)
- [ ] Loading (skeleton) e erro (toast + retry)
- [ ] Acessibilidade (focus, labels)
- [ ] Animações definidas (entrada de lista, abertura de modal)

---

## 10. Documentos de referência

- [FEATURES.md](FEATURES.md) – Lista completa de features (B01–B121)
- [brand_guidelines.md](brand_guidelines.md) – Cores, logo, tipografia, estilo
- [ARCHITECTURE.md](ARCHITECTURE.md) – Apps, stack, API
- [API.md](API.md) – Endpoints e contratos
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) – Status do backend e fases

---

*Plano criado para alinhar produto, design e desenvolvimento do Dunnaa Pro Web e Mobile. Revise e ajuste prioridades conforme o time e o roadmap (MVP 1.0 / 1.1).*
