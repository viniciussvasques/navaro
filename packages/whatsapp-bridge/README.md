# WhatsApp Bridge

Serviço **dentro do projeto Navaro** (`packages/whatsapp-bridge`) que conecta um número de WhatsApp via protocolo **não oficial** (WhatsApp Web / Baileys) e expõe uma **API REST** para envio de mensagens.

**Estratégia:** usar o bridge no início (sem custo de API oficial). Quando escalar, trocar para provedor oficial (Twilio ou Meta Cloud API) pelo painel admin, sem mudar o resto do sistema.

## Requisitos

- Node.js 18+
- Um celular com WhatsApp (para escanear o QR na primeira vez)

## Instalação

```bash
cd packages/whatsapp-bridge
npm install
```

## Uso

1. Inicie o serviço:

```bash
npm start
```

2. Na **primeira execução**, um **QR Code** aparece no terminal. Escaneie com o WhatsApp do celular (Aparelho conectado / Dispositivos vinculados).

3. A sessão fica salva na pasta `auth_info/`. Nas próximas vezes o serviço reconecta sem precisar escanear de novo.

4. Envie mensagens via API:

```bash
curl -X POST http://localhost:3100/send-text \
  -H "Content-Type: application/json" \
  -d '{"phone": "5511999999999", "message": "Olá!"}'
```

## Variáveis de ambiente

| Variável | Padrão  | Descrição      |
|----------|---------|----------------|
| `PORT`   | `3100`  | Porta da API.  |

Copie `.env.example` para `.env` e ajuste se quiser.

## Endpoints

| Método | Rota        | Descrição |
|--------|-------------|-----------|
| GET    | `/health`   | Health check. |
| GET    | `/status`   | `{ connected: boolean, qr?: string }` – status da conexão e QR em base64 (se não conectado). |
| GET    | `/qr`      | Retorna o QR em base64 para exibir em página (quando não conectado). |
| POST   | `/send-text` | Body: `{ "phone": "5511999999999", "message": "Texto" }`. Envia mensagem de texto. |

**Phone:** só números, com DDI (ex: `5511999999999`). Sem `+`, espaços ou traços.

## Integração com a API principal (Navaro)

A API do Navaro já suporta Twilio e Meta. Para usar este bridge, basta adicionar o provider `"bridge"` no `WhatsAppService` (Python): quando `whatsapp_provider = "bridge"`, a API chama `POST {WHATSAPP_BRIDGE_URL}/send-text` com `phone` e `message`. Ao escalar, altere no painel para `twilio` ou `meta` e use o provedor oficial.

## Avisos

- **Não é API oficial.** O uso pode violar os termos do WhatsApp. Use por sua conta e risco; evite spam e alto volume.
- Sessão em `auth_info/` é sensível; não commite no git (já está no `.gitignore`).
- Um número por instância; para vários números, rode várias instâncias (por exemplo em portas diferentes).
- **Erro 405 (Connection Failure):** o QR não aparece quando a conexão com os servidores do WhatsApp falha antes de gerar o QR. Causas comuns: mesmo número/IP já conectado em outro lugar, rede do servidor (ex.: Docker) bloqueada ou limitada pelo WhatsApp, firewall. Testar em outra rede ou VPS pode ajudar.

## Stack

- [Baileys](https://github.com/WhiskeySockets/Baileys) – conexão WhatsApp Web
- Express – API HTTP
