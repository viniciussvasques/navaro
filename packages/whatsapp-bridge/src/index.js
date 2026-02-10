/**
 * WhatsApp Bridge Service
 *
 * Conecta um número via protocolo WhatsApp Web (Baileys) e expõe API REST
 * para envio de mensagens. Útil para notificações (OTP, agendamento, fila)
 * sem depender de API oficial (Twilio/Meta) ou de serviços como Z-API.
 *
 * Uso: npm start → escanear QR no terminal (ou GET /qr) → POST /send-text
 */
import { connect } from "./whatsapp.js";
import { startApi } from "./api.js";

const PORT = parseInt(process.env.PORT || "3100", 10);

async function main() {
  console.log("[WhatsApp Bridge] Iniciando...");
  // Subir HTTP primeiro para /status e /qr ficarem disponíveis logo (evita 503 na API)
  await startApi(PORT);
  console.log("[WhatsApp Bridge] API ok. Conectando WhatsApp...");
  connect().catch((err) => {
    console.error("[WhatsApp Bridge] Erro na conexão WhatsApp:", err?.message || err);
  });
  console.log("[WhatsApp Bridge] Pronto. Escaneie o QR em GET /qr ou no painel se for a primeira vez.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
