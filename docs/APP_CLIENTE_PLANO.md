# App Cliente DUNNAA — Plano completo (MVP + Fase 2)

Objetivo do app: **achar lugar/serviço perto → ver preço/horário e profissional → agendar e pagar**. Search-first e agendamento rápido.

---

## 1. Fluxo principal (caminho feliz)

Splash → Onboarding → Permissões (localização + notificações) → **Home (Busca)** → Resultados → Perfil do estabelecimento → Escolher serviço → Escolher profissional → Escolher data/hora → Confirmar → Pagamento/Reserva → Comprovante → Meus agendamentos.

---

## 2. Geolocalização (uso em todo o app)

A geolocalização é **essencial** para busca “perto de você”, ordenação por distância, mapa e fila (geofence). Tudo abaixo usa lat/lng quando disponível.

### 2.1 Onde a geolocalização é usada

| Uso | Descrição | API / dado |
|-----|-----------|------------|
| **Home “Perto de você”** | Listar estabelecimentos ordenados por distância (e “a partir de X km”). | `GET /establishments?lat=&lng=&radius=` (Haversine no backend). |
| **Resultados da busca** | Ordenação “Distância” e filtro por raio (ex.: 5 km). | Mesmo endpoint com `lat`, `lng`, `radius`. |
| **Mapa de resultados** | Mostrar pins no mapa; raio e cluster. | Mesmo `lat`/`lng`; mapa consome lista já geolocalizada. |
| **Card “X km”** | Exibir distância no card do estabelecimento. | Campo `distance` na resposta quando `lat`/`lng` enviados. |
| **Fila (geofence)** | Só permitir entrar na fila se estiver perto (ex.: 200 m). | App envia `lat`/`lng` no “entrar na fila”; backend valida distância. |
| **“Tem horário hoje” / “Abierto agora”** | (Opcional) priorizar quem está perto e aberto. | Geolocalização + horário de funcionamento + slots. |

### 2.2 Permissão e fallback

- **Onboarding / primeira sessão:** pedir permissão de localização com texto claro: “Pra te mostrar opções perto de você”.
- **Se aceitar:** usar `lat`/`lng` em todas as buscas e na fila (geofence).
- **Se negar:** 
  - Busca por **cidade/bairro** (campo texto).
  - Botão “Usar minha localização” nas telas de busca/resultados para pedir de novo.
  - Ordenação “Distância” desativada ou substituída por “Relevância” / “Melhor avaliados”.
- **Precisão:** para “perto de você” e mapa, precisão aproximada (network/cell) pode bastar; para geofence da fila, preferir GPS (mais preciso).

### 2.3 API (resumo)

- Listagem com geo: `GET /establishments?lat=<lat>&lng=<lng>&radius=<km>&page=&page_size=`.
- Resposta inclui `distance` (km) quando `lat`/`lng` são enviados.
- Entrar na fila: `POST .../queue` (ou equivalente) com corpo incluindo `lat`, `lng`; backend valida geofence (ex.: ≤ 200 m).

---

## 3. Telas e componentes (MVP)

- **Splash:** logo, loader, checagem token/versão/manutenção.
- **Onboarding:** 2–3 telas (“Agende perto de você”, “Escolha profissional”, “Pague no app ou no local”), botão Começar, opção Pular.
- **Permissões:** localização (obrigatório para “perto”) e notificações (lembrete); se negar localização, app funciona com busca por cidade.
- **Home:** localização atual (dropdown “Praia Grande - SP”), ícone filtro, campo “O que você quer hoje?”, chips (Corte, Barba, Combo, etc.), seção “Perto de você” (cards com nome, nota, distância, preço a partir de, “Hoje tem vaga” se tiver), promoções (1 banner), “Ver todos” / “Mapa”.
- **Resultados:** lista + mapa; ordenação: Distância, Melhor avaliados, Menor preço, **Mais horários hoje**; filtros: categoria, preço, avaliação, “aberto agora”, **“tem horário hoje”**.
- **Perfil do estabelecimento:** fotos, nome, nota, distância, horários; serviços (preço/duração); profissionais (cards com agenda e **especialidade** se existir na API); avaliações (lista inicial + **“Ver todas” paginadas**); botão Agendar; abas Agendar | Fila | Info quando abre via QR.
- **Seleção de serviço:** checklist, duração/preço total, observações.
- **Seleção de profissional:** “Sem preferência” + cards (nome, nota, **especialidade**, tempo médio).
- **Calendário/horários:** calendário + slots; “Primeiro horário disponível”.
- **Confirmação:** resumo (local, serviço, profissional, data/hora, valor); política de cancelamento; Confirmar / Voltar.
- **Pagamento:** no MVP “Pagar no local”; **Fase 2: PIX e cartão**.
- **Comprovante:** código/QR, “Adicionar ao calendário”, Cancelar, Reagendar.
- **Meus agendamentos:** Próximos, Passados, “Avaliar atendimento”.

---

## 4. Funcionalidades Fase 2 (incluídas no escopo)

Todas as abaixo estão **no escopo do produto**; implementação após MVP estável.

### 4.1 Pagamento: PIX e cartão

- Pagar agendamento via **PIX** (QR/copia-e-cola) e **cartão** (salvo ou avulso).
- Fluxo: na confirmação, escolher “Pagar agora” → tela de pagamento (PIX ou cartão) → confirmação e comprovante atualizado.
- Integração com gateway (ex.: Stripe/Mercado Pago) na API e no app.

### 4.2 Mapa na lista de resultados

- Aba ou botão **“Mapa”** na tela de resultados.
- Mapa com pins dos estabelecimentos (usando **geolocalização** para centro e raio).
- Toque no pin abre card resumido; toque em “Ver” leva ao perfil.
- Ordenação/filtros da lista aplicados aos pins (mesma fonte de dados).

### 4.3 Filtro “tem horário hoje” e ordenação “Mais horários hoje”

- **Filtro:** checkbox/chip “Tem horário hoje” (estabelecimentos com pelo menos um slot livre hoje).
- **Ordenação:** opção “Mais horários hoje” (quem tem mais slots hoje primeiro).
- Requer endpoint ou lógica na API que considere slots + **localização** (opcional) para performance.

### 4.4 QR dinâmico / campanhas por QR

- **QR dinâmico:** QR que muda a cada X minutos (ex.: na TV do estabelecimento) para reduzir uso remoto; validação por tempo no backend.
- **Campanhas por QR:** link com parâmetros (ex.: `?campaign=promo-janeiro`), landing específica ou desconto; analytics por campanha.
- Mantém **QR estático** (slug/ID) para uso “fixo” na parede.

### 4.5 Avaliações paginadas / “Ver todas”

- Na tela do estabelecimento, seção “Avaliações” com primeiras N (ex.: 5).
- Botão **“Ver todas”** abre tela ou bottom sheet com lista **paginada** (scroll infinito ou “Carregar mais”).
- API: `GET /establishments/{id}/reviews?page=&page_size=`.

### 4.6 Especialidade por profissional

- Se a **API já tiver** campo (ex.: `specialty` ou `services`), exibir nos cards: “Corte masculino, Barba”.
- Se **não existir na API:** exibir “Serviços que faz” derivado dos serviços do estabelecimento que aquele profissional atende (dado que a API já tenha vínculo staff–services).

### 4.7 Modo “continuar no navegador” (PWA) ao escanear QR

- Ao escanear QR, se o usuário **não tiver o app** instalado:
  - Landing com “Abrir no app” / “Instalar” e opção **“Continuar no navegador”**.
  - “Continuar no navegador” abre **PWA** (ou página web responsiva) com mesmo fluxo: perfil do estabelecimento, agendar, fila (se no geofence), pagamento, etc.
- Deep link continua abrindo o app quando instalado (App Links / Universal Links).

### 4.8 Notificações push avançadas

- **Lembrete de agendamento** (já no MVP).
- **Fila:** “Sua vez em X min”, “Faltam 2 pessoas na sua frente”, “Próximo a ser chamado”.
- **Pós-atendimento:** “Avalie seu atendimento”, “Faz X semanas desde seu último corte”.
- **Promoções:** “Promo na [Barbearia X] hoje”.
- Requer FCM/APNs + backend de notificações e preferências do usuário (opt-in por tipo).

### 4.9 Referral / indicação

- **Compartilhar código de indicação** (ou link): “Indique e ganhe R$ X”.
- **Tela “Indicar amigos”:** código + link + botões de share (WhatsApp, etc.).
- **Ganhar desconto por indicação:** quando indicado usa o código, primeiro agendamento (ou primeiro pagamento) gera crédito/desconto para quem indicou.
- Backend: modelo de referral (código, referrer, referred, status, crédito).

---

## 5. QR, deep link e fila (resumo)

- **Link estático:** `https://dunnaa.app/e/<slug-ou-id>` (e para fila: `?mode=queue`).
- **Deep link:** App Links (Android) e Universal Links (iOS); fallback para landing “Abrir / Instalar / Continuar no navegador” (PWA).
- **Fila:** entrada só dentro do **geofence** (ex.: 200 m) ou com **PIN do balcão**; app envia **geolocalização** no request de entrar na fila.
- **Favoritar:** botão ⭐ no perfil do estabelecimento (acessado por busca ou via QR).
- **PWA:** ver 4.7; usa mesma API e **geolocalização** no browser quando o usuário permitir.

---

## 6. Checklist de escopo (MVP vs Fase 2)

| Item | MVP | Fase 2 |
|------|-----|--------|
| Geolocalização (perto de você, distância, geofence) | ✅ | — |
| Splash, onboarding, permissões (local + notificações) | ✅ | — |
| Home busca + chips + “Perto de você” | ✅ | — |
| Resultados: lista + ordenação (distância, avaliação, preço) | ✅ | — |
| Filtro “tem horário hoje” / ordenação “Mais horários hoje” | — | ✅ |
| Mapa na lista de resultados | — | ✅ |
| Perfil estabelecimento (3 abas quando via QR) | ✅ | — |
| Avaliações “Ver todas” paginadas | — | ✅ |
| Especialidade profissional | ✅ (se API tiver) | ✅ (derivar se não tiver) |
| Pagamento “no local” | ✅ | — |
| Pagamento PIX e cartão | — | ✅ |
| Comprovante + adicionar ao calendário | ✅ | — |
| Meus agendamentos + avaliar | ✅ | — |
| QR estático + deep link | ✅ | — |
| Fila (geofence ou PIN) | ✅ | — |
| QR dinâmico / campanhas por QR | — | ✅ |
| PWA ao escanear QR | — | ✅ |
| Notificações push avançadas (fila, promo, etc.) | — | ✅ |
| Referral / indicação | — | ✅ |

---

## 7. Regras técnicas rápidas

- **Geolocalização:** sempre que possível enviar `lat`/`lng` nas chamadas de listagem e fila; tratar permissão negada com fallback por cidade.
- **Privacidade:** não expor ID incremental; usar uuid/slug + token onde fizer sentido; rate limit em endpoints públicos.
- **Segurança fila:** geofence (raio em metros) ou PIN; validar no backend.

Este documento unifica MVP, Fase 2 e uso de **geolocalização** em todo o app cliente.
