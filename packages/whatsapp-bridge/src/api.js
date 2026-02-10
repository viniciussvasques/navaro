/**
 * API HTTP do bridge: POST /send-text e GET /status (opcional GET /qr).
 * O payload do Baileys (qr) é convertido para PNG base64 para o frontend exibir em <img src="data:image/png;base64,...">.
 */
import express from "express";
import QRCode from "qrcode";
import { sendText, getStatus, connect, disconnect } from "./whatsapp.js";

const app = express();
app.use(express.json());

async function qrToDataUrl(rawQr) {
  if (!rawQr) return null;
  try {
    return await QRCode.toDataURL(rawQr, { width: 256, margin: 2 });
  } catch (e) {
    console.warn("[API] qrToDataUrl falhou:", e?.message);
    return null;
  }
}

/** GET /status - { connected: boolean, qr?: string (data URL PNG) } */
app.get("/status", async (req, res) => {
  try {
    const status = getStatus();
    if (status.qr) {
      status.qr = await qrToDataUrl(status.qr) || status.qr;
    }
    res.json(status);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** GET /qr - retorna QR como data URL PNG para exibir no navegador (quando não conectado) */
app.get("/qr", async (req, res) => {
  const { connected, qr } = getStatus();
  if (connected) {
    return res.json({ connected: true, message: "Já conectado." });
  }
  if (!qr) {
    return res.status(404).json({ connected: false, error: "QR ainda não gerado. Aguarde." });
  }
  const dataUrl = await qrToDataUrl(qr);
  res.json({ connected: false, qr: dataUrl || qr });
});

/**
 * POST /send-text
 * Body: { "phone": "5511999999999", "message": "Texto aqui" }
 * Phone: só números, com DDI (ex: 5511999999999).
 */
app.post("/send-text", async (req, res) => {
  const { phone, message } = req.body || {};
  if (!phone || !message) {
    return res.status(400).json({
      error: "Campo obrigatório: phone e message",
    });
  }
  try {
    await sendText(phone, message);
    res.json({ ok: true, message: "Mensagem enviada." });
  } catch (e) {
    res.status(503).json({
      ok: false,
      error: e.message || "Falha ao enviar",
    });
  }
});

/** Health simples */
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "whatsapp-bridge" });
});

/**
 * POST /disconnect
 * Desvincula o número atual (logout + limpeza de auth_info) e inicia nova conexão para gerar outro QR.
 */
app.post("/disconnect", async (req, res) => {
  try {
    await disconnect();
    // Inicia reconexão em background para que o QR apareça novamente
    connect().catch((e) => {
      console.error("[API] Erro ao reconectar após disconnect:", e?.message || e);
    });
    res.json({ ok: true, message: "Sessão desconectada. Um novo QR será gerado em instantes." });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Falha ao desconectar" });
  }
});

export function startApi(port = 3100) {
  return new Promise((resolve) => {
    app.listen(port, () => {
      console.log(`[API] http://localhost:${port}`);
      console.log(`  GET  /status   - status da conexão WhatsApp`);
      console.log(`  GET  /qr       - QR code (base64) quando não conectado`);
      console.log(`  POST /send-text - body: { "phone": "5511999999999", "message": "..." }`);
      resolve();
    });
  });
}
