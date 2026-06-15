# Configurar Mercado Pago no Dunnaa (PIX)

Depois de criar a conta no Mercado Pago, siga estes passos para ativar PIX no Dunnaa.

---

## 1. Pegar as credenciais no Mercado Pago

1. Acesse **https://www.mercadopago.com.br/developers**
2. Entre com sua conta Mercado Pago.
3. Vá em **Suas integrações** → escolha sua aplicação (ou crie uma).
4. No menu lateral, abra **Credenciais**.
5. Use:
   - **Credenciais de teste** — para desenvolvimento (pagamentos simulados).
   - **Credenciais de produção** — para receber pagamentos reais.
6. Copie:
   - **Access Token** (chave privada, usada no backend).
   - **Public Key** (chave pública; opcional no Dunnaa, mas útil se o app usar Checkout Pro no front).

Referência: [Credenciais – Mercado Pago Developers](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/credentials)

---

## 2. Configurar no painel Admin do Dunnaa

1. Acesse o **Admin** do Dunnaa (ex.: `https://admin.dunnaa.com.br`).
2. Faça login.
3. No menu lateral, clique em **Configurações**.
4. Abra a aba **Pagamentos**.
5. Preencha as chaves do Mercado Pago:
   - **mercadopago_access_token** — cole o **Access Token** (produção ou teste).
   - **mercadopago_public_key** — (opcional) cole a **Public Key**.
   - **mercadopago_enabled** — coloque `true` para ativar PIX via Mercado Pago.
6. Salve cada campo (o painel usa “Salvar” por configuração).

Depois de salvar, o status em **Planos** deve mostrar “Mercado Pago (PIX): Configurado — token ativo”.

---

## 3. Webhook (notificações de pagamento)

Para o Dunnaa receber quando um PIX for pago, o Mercado Pago precisa enviar notificações para sua API:

1. No painel do Mercado Pago (Desenvolvedores → sua aplicação), vá em **Webhooks** ou **Notificações**.
2. Cadastre a URL de produção:
   ```
   https://api.dunnaa.com.br/api/v1/payments/webhooks/mercadopago
   ```
   (Troque pelo seu domínio da API se for diferente.)
3. Selecione os eventos que deseja (ex.: pagamentos).
4. Se o Mercado Pago pedir um “secret” ou “verificação”, use o valor que você configurar no admin na chave **mercadopago_webhook_secret** (quando existir suporte no código).

Sem webhook, o sistema pode não marcar o pagamento como concluído sozinho; o app pode fazer polling do status em alguns fluxos.

---

## 4. Estabelecimentos e repasse (PIX para o dono)

Para cada **estabelecimento** receber o valor na própria chave PIX após o pagamento:

1. No **Pro** (painel do estabelecimento), o dono acessa **Configurações**.
2. Na seção **Pagamento pelo app (PIX)** e **Chave PIX**, preenche:
   - **Tipo da chave PIX** (CPF, CNPJ, e-mail, telefone ou chave aleatória).
   - **Chave PIX** (o valor da chave).
3. Ativa **Repasse automático** (se estiver disponível), para o valor líquido ser enviado para essa chave após cada pagamento.

Isso usa a integração de **auto-payout** da API (repasse via Mercado Pago para a chave PIX do estabelecimento).

---

## 5. Estabelecimentos e usuários de teste (seeds)

Para testar PIX com dados já populados, rode os seeds no container da API:

```bash
# Na raiz do repo
docker compose exec api bash -c "cd /app && PYTHONPATH=. python -m seeds.run_seeds"
```

Isso cria:

- **Barbearia Teste PIX** (slug: `barbearia-teste-pix`)
  - Dono: `dono.pix@teste.dunnaa.com.br` / senha: `teste123`
  - Serviços: Corte Masculino R$45, Corte+Barba R$65, Barba R$30
  - Staff: Barbeiro João, Barbeiro Maria
- **Salão Beleza Teste** (slug: `salao-beleza-teste`)
  - Dono: `dono.salao@teste.dunnaa.com.br` / senha: `teste123`
- **Cliente de teste:** `cliente@teste.dunnaa.com.br` / senha: `teste123`

Agenda: seg–sáb 9h–19h (sáb até 17h), domingo fechado. Um agendamento futuro já é criado na Barbearia Teste PIX para testar o endpoint `POST /api/v1/payments/create-intent` com `provider=mercadopago`.

Para testar manualmente: faça login no Pro com um dos donos, configure as chaves de teste do Mercado Pago no Admin (Configurações → Pagamentos) e, no app cliente, use o cliente de teste para agendar e gerar um PIX.

---

## 6. OAuth Marketplace (split por estabelecimento)

Para cada estabelecimento receber direto na conta Mercado Pago com a taxa DUNNAA descontada automaticamente:

### Admin (integrador)

1. No [Mercado Pago Developers](https://www.mercadopago.com.br/developers), crie uma aplicação **marketplace**.
2. Em **Admin → Configurações → Pagamentos**, configure:
   - `mercadopago_access_token` — token do **integrador** (marketplace)
   - `mercadopago_client_id` — Client ID OAuth
   - `mercadopago_client_secret` — Client Secret OAuth
   - `mercadopago_oauth_redirect_uri` — `https://api.dunnaa.com.br/api/v1/mercadopago/oauth/callback`
   - `mercadopago_enabled` — `true`
3. No painel MP, cadastre a mesma **Redirect URI** na aplicação.

### Pro (dono do estabelecimento)

1. Acesse **Configurações** no DUNNAA Pro Web.
2. Na seção **Mercado Pago — Split automático**, clique em **Conectar Mercado Pago**.
3. Autorize com a conta MP do estabelecimento.
4. Após conectar, pagamentos PIX/cartão usam `collector_id` + `application_fee` (split automático).

Sem OAuth, o repasse continua via **chave PIX + repasse automático** (seção 4).

---

## Resumo

| Onde              | O que fazer |
|-------------------|-------------|
| **Mercado Pago**  | Criar app, copiar Access Token (e Public Key se quiser). |
| **Admin Dunnaa**  | Configurações → Pagamentos → `mercadopago_access_token`, `mercadopago_enabled = true`. |
| **Mercado Pago**  | Webhooks → URL `https://api.dunnaa.com.br/api/v1/payments/webhooks/mercadopago`. |
| **Pro (estabelecimento)** | Configurações → Chave PIX e repasse automático **ou** Conectar Mercado Pago (OAuth split). |

Depois disso, os pagamentos PIX no app usarão o Mercado Pago e o Admin passará a mostrar “Mercado Pago (PIX)” como configurado.
