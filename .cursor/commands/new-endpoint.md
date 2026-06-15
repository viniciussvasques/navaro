# New Endpoint

Cria um novo endpoint REST no backend DUNNAA.

## Instruções

Siga a skill `.cursor/skills/create-api-endpoint/SKILL.md` completa.

## Input necessário

Pergunte ao usuário se não estiver claro:

1. **Domínio** (appointments, queue, payments, etc.)
2. **Operação** (GET list, POST create, PATCH update, DELETE)
3. **Quem acessa** (customer, owner, staff, admin)
4. **Request/response** esperados

## Entregáveis

- [ ] `app/schemas/{domain}.py` — schemas
- [ ] `app/services/{domain}_service.py` — lógica
- [ ] `app/api/v1/{domain}.py` — route
- [ ] Registro em `router.py`
- [ ] `tests/api/v1/test_{domain}.py`
- [ ] Atualização `docs/API.md` se contrato novo

Use agent `@backend-api` para implementação e `@backend-reviewer` após concluir.
