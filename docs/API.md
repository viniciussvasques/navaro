# 🔌 Navaro - API Reference

**Base URL**: `https://api.navaro.app/api/v1`

## Autenticação

Todas as rotas protegidas requerem header:
```
Authorization: Bearer <token>
```

---

## Auth

### POST /auth/send-code
Envia código SMS para o telefone.

**Request**:
```json
{
  "phone": "+5511999999999"
}
```

**Response 200**:
```json
{
  "message": "Código enviado",
  "expires_in": 300
}
```

### POST /auth/verify
Verifica código e retorna tokens.

**Request**:
```json
{
  "phone": "+5511999999999",
  "code": "123456"
}
```

**Response 200**:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": {
    "id": "uuid",
    "phone": "+5511999999999",
    "name": null,
    "role": "customer"
  }
}
```

### POST /auth/refresh
Renova access token.

**Request**:
```json
{
  "refresh_token": "eyJ..."
}
```

---

## Users

### GET /users/me
Retorna usuário autenticado.

### PATCH /users/me
Atualiza perfil.

**Request**:
```json
{
  "name": "João Silva",
  "email": "joao@email.com"
}
```

---

## Establishments

### GET /establishments
Lista estabelecimentos.

**Query params**:
- `q`: busca por nome
- `city`: filtrar por cidade
- `page`: página (default 1)
- `limit`: itens por página (default 20)

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Barbearia do João",
      "category": "barbershop",
      "address": "Rua X, 123",
      "logo_url": "https://...",
      "rating": 4.8
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50
  }
}
```

### GET /establishments/:id
Detalhes do estabelecimento.

### POST /establishments
Cria estabelecimento (owner).

### PATCH /establishments/:id
Atualiza estabelecimento (owner).

---

## Services

### GET /establishments/:id/services
Lista serviços do estabelecimento.

### POST /establishments/:id/services
Cria serviço (owner).

### PATCH /services/:id
Atualiza serviço (owner).

### DELETE /services/:id
Remove serviço (owner).

---

## Staff

### GET /establishments/:id/staff
Lista funcionários.

### POST /establishments/:id/staff
Adiciona funcionário.

### PATCH /staff/:id
Atualiza funcionário.

### DELETE /staff/:id
Remove funcionário.

---

## Subscription Plans

### GET /establishments/:id/plans
Lista planos disponíveis.

### POST /establishments/:id/plans
Cria plano (owner).

**Request**:
```json
{
  "name": "Plano Pro",
  "description": "8 cortes por mês",
  "price": 279.00,
  "max_uses_per_week": 2,
  "service_ids": ["uuid1", "uuid2"]
}
```

### PATCH /plans/:id
Atualiza plano.

---

## Appointments

### GET /appointments
Lista agendamentos do usuário.

### GET /establishments/:id/appointments
Lista agendamentos do estabelecimento (owner/staff).

**Query params**:
- `date`: data (YYYY-MM-DD)
- `staff_id`: filtrar por funcionário
- `status`: filtrar por status

### POST /appointments
Cria agendamento.

**Request**:
```json
{
  "establishment_id": "uuid",
  "service_id": "uuid",
  "staff_id": "uuid",
  "scheduled_at": "2026-02-10T14:00:00Z",
  "payment_type": "single"
}
```

### PATCH /appointments/:id
Atualiza status.

**Request**:
```json
{
  "status": "completed"
}
```

### DELETE /appointments/:id
Cancela agendamento.

---

## Subscriptions

### GET /subscriptions
Lista assinaturas do usuário.

### GET /establishments/:id/subscriptions
Lista assinantes (owner).

### POST /subscriptions
Cria assinatura.

**Request**:
```json
{
  "plan_id": "uuid",
  "payment_method_id": "pm_xxx"
}
```

**Response 200**:
```json
{
  "id": "uuid",
  "plan": {...},
  "status": "active",
  "current_period_end": "2026-03-04T00:00:00Z"
}
```

### DELETE /subscriptions/:id
Cancela assinatura.

---

## Check-in

### GET /establishments/:id/checkin/qr
Gera QR code para check-in (owner/staff).

**Response 200**:
```json
{
  "qr_token": "eyJ...",
  "expires_at": "2026-02-04T15:02:00Z"
}
```

### POST /checkins
Realiza check-in (cliente).

**Request**:
```json
{
  "qr_token": "eyJ..."
}
```

**Response 200**:
```json
{
  "success": true,
  "appointment": {...},
  "subscription_usage": {
    "uses_this_week": 2,
    "max_uses_per_week": 4
  }
}
```

**Response 400**:
```json
{
  "error": {
    "code": "DAILY_LIMIT_REACHED",
    "message": "Você já fez check-in hoje"
  }
}
```

---

## Payments

### GET /payments
Histórico de pagamentos (usuário).

### GET /establishments/:id/payments
Histórico de pagamentos (owner).

### POST /payments/create-intent
Cria payment intent (avulso).

**Request**:
```json
{
  "appointment_id": "uuid"
}
```

**Response 200**:
```json
{
  "client_secret": "pi_xxx_secret_xxx"
}
```

---

## Webhooks

### POST /webhooks/stripe
Webhook do Stripe.

Eventos tratados:
- `payment_intent.succeeded`
- `payment_intent.failed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.deleted`

---

## Códigos de Erro

| Código | HTTP | Descrição |
|--------|------|-----------|
| INVALID_CODE | 400 | Código SMS inválido |
| CODE_EXPIRED | 400 | Código expirou |
| DAILY_LIMIT_REACHED | 400 | Limite diário atingido |
| WEEKLY_LIMIT_REACHED | 400 | Limite semanal atingido |
| NO_APPOINTMENT | 400 | Sem agendamento hoje |
| SUBSCRIPTION_INACTIVE | 400 | Assinatura não ativa |
| NOT_FOUND | 404 | Recurso não encontrado |
| UNAUTHORIZED | 401 | Não autenticado |
| FORBIDDEN | 403 | Sem permissão |
| VALIDATION_ERROR | 422 | Erro de validação |

---

## Rate Limits

| Endpoint | Limite |
|----------|--------|
| /auth/* | 5/min |
| /checkins | 60/min |
| Default | 100/min |
