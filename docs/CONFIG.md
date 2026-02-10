# Configuração dinâmica (Admin)

As configurações do sistema são armazenadas no banco (`system_settings`), editáveis pelo painel admin e cacheadas no Redis. Não é necessário redeploy para alterar tokens, taxas ou flags.

## Categorias (painel admin)

| Categoria (API) | Rótulo no painel | Conteúdo |
|-----------------|------------------|----------|
| `general`       | Geral            | Nome do app, suporte, termos, privacidade |
| `finance`       | Financeiro       | Taxas por plano (Free, Prata, Ouro) |
| `payments`      | Pagamentos       | Stripe e Mercado Pago (keys, webhook, taxa plataforma, habilitar) |
| `twilio`        | Twilio (SMS + WhatsApp) | Account SID, Auth Token, número SMS, número WhatsApp |
| `sms`           | SMS              | Provedor (twilio/nvoip), nVoIP (token, número), habilitar |
| `email`         | E-mail           | SMTP (host, porta, usuário, senha, from, TLS, habilitar) |
| `push`          | Push             | FCM e OneSignal (keys, habilitar) |
| `whatsapp`      | WhatsApp         | Provedor (twilio/meta), Meta API ou Twilio (número), habilitar |
| `storage`       | Storage          | S3/R2 (endpoint, keys, bucket, URL pública, habilitar) |
| `loyalty`       | Fidelidade       | Cashback (habilitar, percentual) |

## Onde a configuração dinâmica é usada

| Serviço / Módulo | Uso |
|------------------|-----|
| **SettingsService** | Leitura/escrita em DB + cache Redis (TTL 1h). `get`, `get_bool`, `get_float`. |
| **payment_service** | Taxa de comissão por plano (Free/Silver/Gold) via `get_float`; credenciais Stripe e Mercado Pago (secret key, webhook secret, access token) via `get` para os providers. |
| **email_service** | SMTP e “enabled” via `get` / `get_bool` (host, port, user, password, from, TLS). |
| **sms_service** | nVoIP (enabled, token, from_number) via `get` / `get_bool`. |
| **whatsapp_service** | WhatsApp via Twilio ou Meta (enabled, provider, twilio_*, ou api_url, access_token, phone_number_id). |
| **push_service** | FCM (enabled, server_key). |
| **notification_service** | SMS (enabled, provider twilio/nvoip, credenciais Twilio ou NVOIP_TOKEN). |
| **appointment_service** | Cashback (CASHBACK_ENABLED, CASHBACK_PERCENT) e bônus de indicação. |

## Pagamentos (Stripe e Mercado Pago) — config dinâmica

- **Stripe**: O `PaymentService` carrega `stripe_secret_key` e o webhook `stripe_webhook_secret` do `SettingsService` antes de criar o intent e de validar o webhook. Fallback para variáveis de ambiente se não houver valor no admin.
- **Mercado Pago**: O `access_token` é passado do admin para o `MercadoPagoProvider`. O fluxo (create_intent, webhook, refund) está **implementado e integrado** (factory, rota de webhook, modelo de pagamento); a implementação atual do provider é **mock** (respostas simuladas para PIX). Para produção, basta trocar o mock por chamadas reais ao SDK do Mercado Pago usando `self.access_token`.

## Configuração SMS e WhatsApp (Twilio)

Para usar **SMS e/ou WhatsApp** com Twilio (recomendado para Brasil): criar conta em [twilio.com](https://www.twilio.com), comprar número para SMS (Brasil), configurar sandbox ou número próprio para WhatsApp, e preencher no painel as chaves da categoria **Twilio** e **SMS** / **WhatsApp**. Passo a passo completo: **[TWILIO_SETUP.md](./TWILIO_SETUP.md)**.

Resumo: **SMS** — precisa comprar número Twilio (Brasil, com capacidade SMS). **WhatsApp** — sandbox (sem comprar) para testes; produção exige número aprovado no fluxo WhatsApp Business.

## Configuração SMS (nVoIP)

Documentação oficial: **https://nvoip.docs.apiary.io/** (API v2). Contrato local: **`nvoip.apib`** (Group SMS, “Enviar SMS” [POST] `/sms`, linhas 992-1085). A implementação está alinhada ao contrato.

- **Endpoint:** `POST https://api.nvoip.com.br/v2/sms`
- **Autenticação:** `Authorization: Bearer {access_token}` (OAuth) ou `napikey` na URL.
- **Body:** `numberPhone` (número destino), `message` (até 160 caracteres, sem acentuação), `flashSms` (boolean).

O que inserir no **painel admin** (Configurações → SMS), alinhado ao **painel nVoIP** (Desenvolvedor):

| Campo no painel admin | O que inserir |
|------------------------|---------------|
| **NVOIP_TOKEN** | **Napikey** do painel nVoIP (Desenvolvedor → campo "Napikey"). Não use o "User Token"; use a Napikey. Alternativa: OAuth access_token se preferir. |
| **NVOIP_FROM_NUMBER** | Número ou ID de origem para SMS. **Não use e-mail**; deixe em branco se não aplicável. |
| **SMS_ENABLED** | `true` para ativar envio real; `false` para desativar. |

A API nVoIP aceita Napikey (na URL) ou OAuth (Bearer). O código detecta e usa Napikey na URL quando o valor não for um JWT. URL base: env `NVOIP_API_URL`. Mensagens sem acentuação, até 160 caracteres.

### Notificações ativas por SMS

| Notificação | Ativa? | Onde é enviada |
|-------------|--------|----------------|
| **Código de verificação (OTP)** | Sim | Login: `POST /auth/send-code` → envia por SMS (se `sms_enabled`) e/ou WhatsApp (se `whatsapp_enabled`). Resposta inclui `sms_sent`, `sms_error`, `whatsapp_sent`, `whatsapp_error`. |
| **Lembrete de agendamento (24h antes)** | Sim | Job do scheduler (a cada hora): `SMSService.send_appointment_reminder()`. Enviado para o telefone do cliente quando o agendamento está entre 23h e 25h à frente. |

### Notificações por WhatsApp (ligadas)

O sistema envia **WhatsApp** (via Twilio ou Meta) nos seguintes fluxos, quando `whatsapp_enabled` está ativo:

| Fluxo | Momento | Método |
|-------|---------|--------|
| **Verificação de conta (OTP)** | `POST /auth/send-code` | `WhatsAppService.send_verification_code` |
| **Agendamento criado** | Após criar agendamento | `send_appointment_confirmation` |
| **Agendamento confirmado** | Quando status muda para `confirmed` (ex.: dono confirma) | `send_appointment_confirmation` |
| **Agendamento cancelado** | Cliente ou suporte cancela | `send_appointment_cancelled` |
| **Lembrete 24h antes** | Job do scheduler | `send_appointment_reminder` |
| **Fila: entrada** | Cliente entra na fila (`POST /queue` ou check-in sem agendamento) | `send_queue_joined` |
| **Fila: chamado** | Estabelecimento marca “chamado” | `send_queue_called` |
| **Fila: atendimento iniciado** | Estabelecimento marca “em atendimento” | `send_queue_serving` |

Configuração: categoria **WhatsApp** (`whatsapp_enabled`, `whatsapp_provider`) e **Twilio** (`twilio_account_sid`, `twilio_auth_token`, `twilio_whatsapp_from`). Ver [TWILIO_SETUP.md](./TWILIO_SETUP.md).

---

## O que ainda usa apenas variáveis de ambiente

- **JWT / auth**: `SECRET_KEY`, `ALGORITHM` continuam em config (env) por segurança e ciclo de vida diferente.

## API admin

- `GET /api/v1/admin/settings` — lista todas (opcional: `?category=payments`). Resposta: `{ items: [{ key, value, description, is_secret, category }], total }`.
- `GET /api/v1/admin/settings/{key}` — uma configuração.
- `PUT /api/v1/admin/settings/{key}` — atualizar valor (body: `{ value }`).
- `POST /api/v1/admin/settings` — criar nova.
- `DELETE /api/v1/admin/settings/{key}` — remover.
- `POST /api/v1/admin/settings/seed-defaults` — criar no banco todas as chaves padrão que ainda não existem (sem sobrescrever).

Após `PUT`/`POST`/`DELETE`, o valor no Redis é atualizado ou removido para refletir a mudança sem esperar o TTL.

## Painel admin × sistema: chaves e leitura dinâmica

- **Painel:** chama `GET /api/v1/admin/settings`; a API usa `SettingsService(db).list_all(category)` e lê do banco (`system_settings`). Os itens são exibidos por categoria (Geral, Financeiro, Pagamentos, SMS, etc.).
- **Sistema:** em runtime, cada serviço usa `SettingsService(session).get(key)` / `get_bool(key)` / `get_float(key)`, que consultam **primeiro Redis** (cache) e, em caso de miss, **banco**. Ou seja, chaves e tokens são buscados **dinamicamente do banco** (com cache em Redis).

Todas as chaves abaixo existem em `SettingsKeys`, são inseridas pelo `seed-defaults` e aparecem no painel na categoria indicada. O sistema usa apenas essas chaves (via `SettingsService`), com fallback para env onde indicado.

| Categoria painel | Chave | Usado por |
|------------------|-------|-----------|
| **Twilio** | twilio_account_sid, twilio_auth_token, twilio_sms_from, twilio_whatsapp_from | notification_service (SMS), whatsapp_service (WhatsApp) |
| **SMS** | sms_enabled, sms_provider, nvoip_token, nvoip_from_number | notification_service (OTP), sms_service, scheduler (lembrete) |
| **Pagamentos** | stripe_enabled, stripe_secret_key, stripe_publishable_key, stripe_webhook_secret, stripe_platform_fee_percent, mercadopago_enabled, mercadopago_access_token, mercadopago_public_key, mercadopago_webhook_secret | payment_service, payments.py (webhook) |
| **Financeiro** | commission_free, commission_silver, commission_gold | payment_service (taxa por plano) |
| **E-mail** | email_enabled, smtp_* | email_service |
| **Push** | fcm_enabled, fcm_server_key, fcm_project_id, onesignal_* | push_service |
| **WhatsApp** | whatsapp_enabled, whatsapp_provider, twilio_whatsapp_from ou whatsapp_api_url, access_token, phone_number_id | whatsapp_service, auth (OTP) |
| **Storage** | storage_enabled, s3_* | (uso futuro) |
| **Geral** | app_name, support_email, support_phone, terms_url, privacy_url | (uso futuro / app) |
| **Fidelidade** | cashback_enabled, cashback_percent, referral_bonus_amount | appointment_service |
