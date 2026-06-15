# Análise de Gaps: Painel Admin vs Backend

Documento de análise completa entre o painel admin (`packages/web-admin`) e o backend FastAPI (`packages/api`), incluindo bugs encontrados e correções aplicadas.

---

## 1. Resumo executivo

- **Auth e RBAC**: Login define cookie `access_token` no backend e o frontend define `user_role` e `user_name`; o menu é filtrado por role (support não vê Financeiro, Configurações, WhatsApp Bridge). **Sem gap**.
- **Acesso admin a recursos por estabelecimento**: `verify_establishment_access` em `app/dependencies.py` permite `UserRole.admin` para qualquer estabelecimento. Agendamentos, serviços, staff e produtos por estabelecimento funcionam para admin. **Sem gap**.
- **Bugs corrigidos nesta análise**:
  1. **Backend**: `admin_payouts.py` usava `PayoutStatus.completed`, que não existe no enum; corrigido para `PayoutStatus.succeeded`.
  2. **Frontend**: `UserService.updateRole` chamava `PATCH /admin/users/:id/role`; o backend expõe `PATCH /users/:id/role`. Corrigido para `/users/${id}/role`.

---

## 2. Mapeamento de rotas do admin

| Página / Recurso | Chamadas do frontend | Backend (API v1) | Status |
|------------------|----------------------|------------------|--------|
| Login | `POST /auth/login` | `POST /auth/login` (cookie `access_token`) | OK |
| Layout (me) | `GET /users/me` | `GET /users/me` (CurrentUser) | OK |
| Layout (notificações) | `GET /notifications` | `GET /notifications` → `{ items, total, page, page_size, unread_count }` | OK (front usa `items`) |
| Logout | `POST /auth/logout` | `POST /auth/logout` (limpa cookie) | OK |
| Dashboard | `GET /admin/analytics/dashboard` | `GET /admin/analytics/dashboard` | OK |
| Estabelecimentos | `GET /admin/establishments`, `PATCH /admin/establishments/:id/approve` | Idem | OK |
| Usuários | `GET /users`, `PATCH /users/:id/role` | `GET /users` (AdminUser), `PATCH /users/:id/role` | OK (path corrigido) |
| Financeiro | `GET /admin/payouts`, `GET /admin/analytics/dashboard`, `PATCH /admin/payouts/:id/approve` | Idem | OK (enum payouts corrigido) |
| Configurações | `GET /admin/settings`, `PUT /admin/settings/:key`, `POST /admin/settings/seed-defaults` | Idem | OK |
| Logs | `GET /admin/logs/stream`, `POST /admin/logs/test` | Idem | OK |
| WhatsApp Bridge | `GET /admin/whatsapp-bridge/status`, `POST /admin/whatsapp-bridge/disconnect` | Idem | OK |
| Suporte | `SupportService`: `/support/tickets`, `/support/tickets/:id`, etc. | `GET/POST /support/tickets`, etc. | OK |
| Agendamentos | `GET /admin/establishments`, `GET /appointments/establishments/:id` | Admin tem acesso via `verify_establishment_access` | OK |
| Serviços | `GET /admin/establishments`, `GET /establishments/:id/services?active_only=false` | Idem | OK |
| Produtos | `GET /admin/establishments`, `GET /establishments/:id/products?active_only=false` | Idem | OK |
| Staff | `GET /admin/establishments`, `GET /establishments/:id/staff` | Idem | OK |

---

## 3. Autenticação e cookies

- **Backend**: Login (`/auth/login`) retorna `AuthResponse` (tokens + user) e define cookie `access_token` (HttpOnly, etc.).
- **Frontend**: Após login, define cookies `user_role` e `user_name` para uso no layout e RBAC. O axios está com `withCredentials: true`; o interceptor só adiciona `Authorization: Bearer` se existir cookie `admin_token` (login não define `admin_token`; a API aceita token pelo cookie `access_token` via `get_current_user`).
- **Conclusão**: Fluxo correto; admin usa cookie `access_token` enviado automaticamente.

---

## 4. Formato de respostas e payloads

- **Dashboard analytics**: Backend retorna `commissions`, `subscription_revenue`, `gmv`, `total_appointments`, etc. Front (Dashboard e Finance) usa `analytics?.commissions`, `analytics?.subscription_revenue` — compatível.
- **Payouts**: Backend retorna `{ items, total, page, page_size }`; cada item é um Payout (ORM serializado). Front usa `p.status === 'pending'` e `p.status === 'completed' || p.status === 'succeeded'`. Com a correção para `PayoutStatus.succeeded`, o valor em JSON é `"succeeded"` — alinhado.
- **Notificações**: Backend retorna `NotificationListResponse` com `items`. Layout usa `res.data.items || []` — OK.
- **Settings**: GET retorna lista com `items`; PUT `/{key}` espera body `{ value }` — front envia `{ value }` — OK.

---

## 5. Melhorias recomendadas (não bloqueantes)

1. **Admin payouts – response model**: O endpoint `GET /admin/payouts` retorna `dict` com `items` sendo listas de modelos ORM. Funciona pela serialização padrão do FastAPI, mas é mais seguro usar um schema Pydantic (ex.: `PayoutResponse`) para garantir formato estável e documentação.
2. **Tratamento de erros no frontend**: Revisar páginas (Finance, Settings, Users, etc.) para exibir mensagens de erro da API (ex.: `err.response?.data?.detail`) em vez de apenas `alert` genérico.
3. **Role update (backend)**: `RoleUpdateRequest.role` é `str`; no handler faz-se `user.role = request.role`. Se o modelo User usa enum `UserRole`, validar e converter no endpoint (ex.: `UserRole(request.role)`) e retornar 400 para valor inválido.
4. **Support dashboard (admin)**: Os botões "Acessar Lista" e "Ver Parceiros" na view de role support não têm `Link` ou `router.push`; são apenas visuais. Pode-se ligar a `/admin/users` e `/admin/establishments` para melhorar UX.

---

## 6. Correções aplicadas

### 6.1 Backend – `packages/api/app/api/v1/admin_payouts.py`

- **Problema**: Ao aprovar payout, o código usava `PayoutStatus.completed`. O enum `PayoutStatus` define apenas: `pending`, `processing`, `succeeded`, `failed`, `cancelled`. Isso geraria erro em tempo de execução.
- **Correção**: Substituído por `PayoutStatus.succeeded`.

### 6.2 Frontend – `packages/web-admin/lib/api.ts`

- **Problema**: `UserService.updateRole` chamava `PATCH /admin/users/${id}/role`. No backend a rota é `PATCH /users/:user_id/role` (router com prefix `/users`).
- **Correção**: Alterado para `api.patch(\`/users/${id}/role\`, { role })`.

---

## 7. Checklist de verificação rápida

- [x] Login e logout (cookie + role no layout)
- [x] Dashboard e analytics (admin e support)
- [x] Estabelecimentos (listagem e aprovação)
- [x] Usuários (listagem e atualização de role – path corrigido)
- [x] Financeiro (payouts e approve – enum corrigido)
- [x] Configurações (GET, PUT, seed-defaults)
- [x] Logs (stream + test)
- [x] WhatsApp Bridge (status, disconnect)
- [x] Suporte (tickets e mensagens)
- [x] Agendamentos por estabelecimento (acesso admin)
- [x] Serviços / Produtos / Staff por estabelecimento (acesso admin)

---

*Documento gerado a partir da análise do repositório navaro (painel admin e backend). Última atualização: fevereiro 2026.*
