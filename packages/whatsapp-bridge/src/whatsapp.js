/**
 * Conexão WhatsApp via Baileys (protocolo não oficial, tipo WhatsApp Web).
 * Mantém sessão em auth_info/ e expõe sendText() para o servidor HTTP.
 */
// ESM interop: Baileys é CJS; usar namespace para ter todas as funções em qualquer ambiente
import * as B from "@whiskeysockets/baileys";
import fs from "fs";
import path from "path";
import { rm } from "fs/promises";
const makeWASocket = B.default ?? B.makeWASocket;
const useMultiFileAuthState = B.useMultiFileAuthState;
const DisconnectReason = B.DisconnectReason;
const fetchLatestBaileysVersion = B.fetchLatestBaileysVersion;
if (typeof makeWASocket !== "function" || typeof useMultiFileAuthState !== "function") {
  throw new Error("Baileys: makeWASocket ou useMultiFileAuthState não encontrados. Verifique a versão do @whiskeysockets/baileys.");
}
function makeNoopLogger() {
  const noop = () => {};
  const L = { trace: noop, debug: noop, info: noop, warn: noop, error: noop, fatal: noop };
  L.child = () => L;
  return L;
}
const logger = makeNoopLogger();
const AUTH_FOLDER = "auth_info";

let sock = null;
let currentQR = null;
let connectionStatus = "close"; // 'close' | 'connecting' | 'open'
let lastConnectionError = null; // { code, message } para exibir no painel

function clearAuthFolderSync() {
  try {
    if (!fs.existsSync(AUTH_FOLDER)) return;
    const entries = fs.readdirSync(AUTH_FOLDER);
    for (const name of entries) {
      const full = path.join(AUTH_FOLDER, name);
      try {
        fs.rmSync(full, { recursive: true, force: true });
      } catch (e) {
        console.log("[WhatsApp] Aviso: não foi possível remover arquivo de auth_info:", full, e?.message || e);
      }
    }
    console.log("[WhatsApp] Conteúdo de auth_info limpo.");
  } catch (e) {
    console.log("[WhatsApp] Aviso: falha ao limpar auth_info:", e?.message || e);
  }
}

/**
 * Formata número para JID WhatsApp.
 *
 * Regra:
 * - Se o usuário informar com DDI explícito (`+`, `00` ou >= 12 dígitos), usamos os dígitos como estão.
 * - Se parecer número nacional (<= 11 dígitos e não começar com 55), prefixamos `55`.
 * Ex:
 *  - "+14079523233"  -> "14079523233@s.whatsapp.net" (EUA, sem forçar 55)
 *  - "5511999999999" -> "5511999999999@s.whatsapp.net" (já com DDI)
 *  - "11999999999"   -> "5511999999999@s.whatsapp.net" (Brasil, sem DDI)
 */
function toJid(phone) {
  const raw = String(phone);
  let digits = raw.replace(/\D/g, "");

  let hasExplicitCountry =
    raw.trim().startsWith("+") ||
    raw.trim().startsWith("00") ||
    digits.length > 11;

  if (!hasExplicitCountry && digits.length <= 11 && !digits.startsWith("55")) {
    digits = "55" + digits;
  }

  return digits + "@s.whatsapp.net";
}

/**
 * Inicia conexão com WhatsApp (QR na primeira vez; sessão salva depois).
 */
export async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

  let version;
  if (typeof fetchLatestBaileysVersion === "function") {
    try {
      const v = await fetchLatestBaileysVersion();
      if (v?.version) version = v.version;
    } catch (e) {
      console.log("[WhatsApp] fetchLatestBaileysVersion falhou, usando padrão:", e?.message?.slice(0, 50));
    }
  }

  const socketConfig = {
    auth: state,
    logger,
    browser: ["Chrome (Linux)", "Chrome", "120.0"],
  };
  if (version) socketConfig.version = version;

  sock = makeWASocket(socketConfig);

  sock.ev.on("connection.update", (update) => {
    const { connection, qr, lastDisconnect } = update;
    if (connection != null || qr != null) {
      console.log("[WhatsApp] connection.update", { connection: connection ?? "-", hasQR: !!qr });
    }

    if (qr) {
      currentQR = qr;
      lastConnectionError = null;
      connectionStatus = "connecting";
      console.log("[WhatsApp] QR recebido — disponível em GET /status e GET /qr");
    }
    if (connection === "open") {
      currentQR = null;
      connectionStatus = "open";
      console.log("[WhatsApp] Conectado.");
    }
    if (connection === "close") {
      connectionStatus = "close";
      const err = lastDisconnect?.error;
      const statusCode = err?.output?.statusCode ?? null;
      lastConnectionError = statusCode != null || err?.message
        ? { code: statusCode, message: (err?.message && String(err.message).slice(0, 120)) || "Connection closed" }
        : null;
      const loggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;
      const delayMs = statusCode === 405 ? 25000 : 5000;
      console.log(
        "[WhatsApp] Desconectado.",
        loggedOut ? "(logout/sessão expirada, limpando auth_info e gerando novo QR)" : `(reconectando em ${delayMs / 1000}s)`,
        "statusCode:",
        statusCode,
        err?.message ? String(err.message).slice(0, 80) : ""
      );
      // Se o WhatsApp indicou logout/401, limpamos as credenciais para forçar novo pareamento.
      if (loggedOut) {
        clearAuthFolderSync();
      }
      // Sempre tentamos reconectar depois de um tempo; se auth_info tiver sido limpo, Baileys vai pedir QR novamente.
      setTimeout(() => {
        connect().catch((e) => {
          console.log("[WhatsApp] Erro ao reconectar após close:", e?.message || e);
        });
      }, delayMs);
    }
  });

  sock.ev.on("creds.update", saveCreds);

  return sock;
}

/**
 * Envia mensagem de texto. phone: string (ex: 5511999999999 ou +55 11 99999-9999).
 */
export async function sendText(phone, message) {
  if (!sock || connectionStatus !== "open") {
    throw new Error("WhatsApp não está conectado. Escaneie o QR ou aguarde a reconexão.");
  }
  const jid = toJid(phone);
  await sock.sendMessage(jid, { text: message });
  return true;
}

/**
 * Desconecta a sessão atual, limpa credenciais em disco
 * e prepara para vincular um novo número.
 */
export async function disconnect() {
  console.log("[WhatsApp] Disconnect solicitado...");
  try {
    if (sock) {
      try {
        await sock.logout();
        console.log("[WhatsApp] Logout enviado para Baileys.");
      } catch (e) {
        console.log("[WhatsApp] Erro ao fazer logout:", e?.message || e);
      }
    }
    sock = null;
    currentQR = null;
    connectionStatus = "close";
    lastConnectionError = null;

    clearAuthFolderSync();
  } catch (e) {
    console.log("[WhatsApp] Erro no disconnect:", e?.message || e);
    // Não propagamos o erro para não quebrar o endpoint; o admin só quer forçar novo QR.
  }
}

/**
 * Status da conexão: { connected: boolean, qr?: string (base64) }
 */
export function getStatus() {
  const connected = connectionStatus === "open";
  return {
    connected,
    qr: connected ? null : currentQR || null,
    error: connected ? null : lastConnectionError,
  };
}
