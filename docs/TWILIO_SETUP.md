# Como configurar Twilio (SMS + WhatsApp)

O sistema usa **Twilio** para enviar SMS e WhatsApp quando configurado no painel admin. Você pode usar só SMS, só WhatsApp ou os dois.

## 1. Criar conta na Twilio

1. Acesse [twilio.com](https://www.twilio.com) e clique em **Sign up**.
2. Preencha e-mail, senha e valide o número de telefone.
3. No **Console** ([console.twilio.com](https://console.twilio.com)) você verá:
   - **Account SID** (ex.: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
   - **Auth Token** (clique em "Show" para ver)

Guarde esses dois valores; serão usados no painel admin.

## 2. SMS no Brasil

### Comprar número para SMS

1. No Console: **Phone Numbers** → **Manage** → **Buy a number**.
2. Em **Country** escolha **Brazil (+55)**.
3. Marque a opção **SMS** (e **Voice** se quiser).
4. Compre um número. O custo é mensal + custo por SMS (consulte [Preços Twilio Brasil](https://www.twilio.com/pt-br/sms/pricing/br)).
5. O número aparecerá no formato **+55 11 xxxxx-xxxx**. Anote no formato E.164: `+5511xxxxxxxxx` (sem espaços).

### Configurar no painel admin

No painel (Configurações), na categoria **SMS**:

| Chave | Valor |
|-------|--------|
| **sms_enabled** | `true` |
| **sms_provider** | `twilio` |
| **twilio_account_sid** | Seu Account SID (categoria **Twilio**) |
| **twilio_auth_token** | Seu Auth Token (categoria **Twilio**) |
| **twilio_sms_from** | Número E.164 do passo anterior (ex: `+5511987654321`) |

Na categoria **Twilio (SMS + WhatsApp)** preencha **twilio_account_sid** e **twilio_auth_token** (são usados tanto para SMS quanto para WhatsApp).

## 3. WhatsApp

A Twilio oferece duas formas de usar WhatsApp:

### Opção A: Sandbox (testes, sem comprar número)

1. No Console: **Messaging** → **Try it out** → **Send a WhatsApp message**.
2. Você verá um número sandbox (ex.: **+1 415 523 8886**) e um código (ex.: **join yellow-tiger**).
3. No seu celular: abra WhatsApp, adicione o número sandbox e envie a mensagem **join yellow-tiger** (ou o código que aparecer).
4. Depois disso você pode **receber** mensagens desse número no WhatsApp.

No painel admin, categoria **WhatsApp**:

| Chave | Valor |
|-------|--------|
| **whatsapp_enabled** | `true` |
| **whatsapp_provider** | `twilio` |
| **twilio_whatsapp_from** | Número do sandbox em E.164 (ex: `+14155238886`) |

O **twilio_whatsapp_from** pode ser só o número (`+14155238886`); o sistema adiciona o prefixo `whatsapp:` na chamada à API.

**Limitação do sandbox:** só funcionam mensagens para números que fizeram "join" no sandbox. Para produção, use a Opção B.

### Opção B: Número próprio (produção)

1. No Console: **Messaging** → **WhatsApp** → **Senders**.
2. Siga o fluxo para conectar uma conta **WhatsApp Business** (Meta) e aprovar um número.
3. Depois de aprovado, use esse número em **twilio_whatsapp_from** no painel (formato E.164, ex: `+5511987654321`).

Documentação Twilio: [WhatsApp no Twilio](https://www.twilio.com/docs/whatsapp).

## 4. Resumo: o que preencher no painel

- **Categoria Twilio (SMS + WhatsApp):**
  - **twilio_account_sid** — Account SID do Console
  - **twilio_auth_token** — Auth Token do Console
  - **twilio_sms_from** — Número Twilio para SMS (E.164), se usar SMS
  - **twilio_whatsapp_from** — Número para WhatsApp (sandbox ou número aprovado), se usar WhatsApp

- **Categoria SMS:**
  - **sms_enabled** — `true` para ativar SMS
  - **sms_provider** — `twilio` (ou `nvoip` se usar nVoIP)

- **Categoria WhatsApp:**
  - **whatsapp_enabled** — `true` para ativar WhatsApp
  - **whatsapp_provider** — `twilio` (ou `meta` para Meta Cloud API)

## 5. Testar

- **Código de verificação (OTP):** chame `POST /api/v1/auth/send-code` com `{ "phone": "+5511999999999" }`. A resposta inclui `sms_sent`, `sms_error`, `whatsapp_sent`, `whatsapp_error` para você ver se cada canal foi enviado ou falhou.
- **Lembretes de agendamento:** o scheduler envia lembretes por SMS e/ou WhatsApp conforme as configurações; com WhatsApp habilitado e Twilio configurado, os lembretes podem sair por WhatsApp.

## Preciso comprar número?

- **SMS:** sim. Para enviar SMS no Brasil você precisa de um número Twilio (comprar em Phone Numbers → Buy a number, Brasil, com capacidade SMS).
- **WhatsApp (sandbox):** não. Use o número do sandbox e faça "join" no celular para testes.
- **WhatsApp (produção):** sim. Você precisa de um número aprovado no fluxo WhatsApp Business da Twilio/Meta.

Veja também: [CONFIG.md](./CONFIG.md) para categorias do painel e uso da configuração dinâmica.
