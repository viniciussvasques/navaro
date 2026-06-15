# Revisão Dunnaa Pro Web – O que está e o que falta

## O que está implementado

| Área | Página / Recurso | Status |
|------|-------------------|--------|
| **Auth** | Login (telefone/OTP + e-mail/senha), Registro, Logout | OK |
| **Onboarding** | Cadastro de estabelecimento, Escolha (sem est. → onboarding ou “sou cliente”) | OK |
| **Dashboard** | Cards: agendamentos hoje, fila, receita hoje; links para Agenda/Financeiro | OK |
| **Agenda** | Lista por data, status, alterar status (confirmar/concluir/cancelar), staff/serviço | OK |
| **Fila** | Lista por estabelecimento, alterar status (chamar/servindo/concluído), remover | OK |
| **Check-in** | Lista de agendamentos do dia (check-in / em atendimento / concluídos) | OK |
| **QR Code** | Analytics (scans, conversões, check-ins), texto explicativo | OK |
| **Serviços** | CRUD serviços, combos (bundles), filtro/busca, inativos, upload imagem | OK |
| **Equipe** | CRUD staff, ativar/desativar, comissão, bio, horário | OK |
| **Financeiro** | Receita hoje/semana/mês, lista de pagamentos (bruto, taxa, líquido, status) | OK |
| **Configurações** | Dados do estabelecimento, horário de funcionamento, fila, pagamentos, taxas, PIX/banco | OK |
| **Layout** | Sidebar com scroll, tema por categoria, redirect sem est. → escolha | OK |
| **API** | Interceptor 401 → limpa cookies e redireciona para login | OK |

---

## Ajustes feitos nesta revisão

1. **Favicon** – Adicionado `app/icon.svg` (logo D) para evitar 404 em favicon.
2. **Middleware** – Rota `/qr-code` incluída em rotas protegidas e no matcher (antes acessível sem token).

---

## Implementado nesta revisão (tudo)

| Item | Descrição |
|------|-----------|
| **Avaliações** | Página `/reviews`: lista avaliações do estabelecimento, paginação, responder à avaliação (modal). |
| **Produtos** | Página `/products`: CRUD produtos (nome, descrição, preço, custo, estoque), busca, seção “Produtos inativos”. |
| **Notificações** | Página `/notifications`: lista com paginação, marcar como lida, marcar todas como lidas. |
| **Saques (Payouts)** | Seção “Saques” na página Financeiro: saldo disponível, solicitar saque (valor), histórico de saques. |
| **Tratamento de erro** | Páginas Financeiro e QR Code: em erro da API exibem card com mensagem amigável. |
| **allowedDevOrigins** | Configurado em `next.config.ts` para pro.dunnaa.com.br e localhost:3006. |
| **Nav e middleware** | Itens Avaliações, Produtos e Notificações no menu; rotas protegidas no middleware. |

---

## Resumo

O Pro Web está completo: login, onboarding, dashboard, agenda, fila, check-in, QR Code, serviços, **produtos**, **avaliações**, financeiro (com **saques**), **notificações**, equipe e configurações. Tratamento de erro em Finance e QR Code; allowedDevOrigins configurado.
