/**
 * Helper completo de tratamento de erros da API DUNNAA.
 *
 * Suporta:
 * - Formato unificado da API: { error: { code, message, field?, details? } }
 * - Legado FastAPI: { detail: string | { message } | [{ msg, loc }] }
 * - Erros de rede / timeout / sem resposta
 *
 * Use `getApiErrorMessage` para mensagens amigáveis e `getApiError` para
 * inspeção estruturada (código, campo, status, field errors de validação).
 */

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_TOKEN"
  | "INVALID_CODE"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "ALREADY_EXISTS"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "INVALID_INPUT"
  | "BAD_REQUEST"
  | "RATE_LIMIT_EXCEEDED"
  | "MAINTENANCE_MODE"
  | "PAYMENT_ERROR"
  | "INSUFFICIENT_CREDITS"
  | "SLOT_NOT_AVAILABLE"
  | "ESTABLISHMENT_CLOSED"
  | "EXTERNAL_SERVICE_ERROR"
  | "INTERNAL_ERROR"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "UNKNOWN";

export type ParsedApiError = {
  message: string;
  code: ApiErrorCode | string;
  status: number | null;
  field: string | null;
  /** Erros de validação por campo (FastAPI 422 ou details). */
  fieldErrors: Record<string, string>;
  /** Segundos sugeridos para retry (rate limit). */
  retryAfter: number | null;
  isNetwork: boolean;
};

// ─── Internos ──────────────────────────────────────────────────────────────────

type AxiosLikeError = {
  response?: {
    status?: number;
    data?: {
      error?: { message?: string; code?: string; field?: string; details?: unknown };
      detail?:
        | string
        | { message?: string }
        | Array<{ msg?: string; message?: string; loc?: unknown[] }>;
    };
    headers?: Record<string, string> | { get?: (k: string) => string | null };
  };
  request?: unknown;
  code?: string;
  message?: string;
};

const DEFAULT_MESSAGE = "Algo deu errado. Tente novamente.";

const FRIENDLY_BY_CODE: Partial<Record<string, string>> = {
  NETWORK_ERROR: "Sem conexão. Verifique sua internet e tente novamente.",
  TIMEOUT: "A requisição demorou demais. Tente novamente.",
  UNAUTHORIZED: "Sua sessão expirou. Faça login novamente.",
  FORBIDDEN: "Você não tem permissão para esta ação.",
  NOT_FOUND: "Não encontramos o que você procura.",
  RATE_LIMIT_EXCEEDED: "Muitas tentativas. Aguarde um momento e tente de novo.",
  MAINTENANCE_MODE: "Sistema em manutenção. Tente novamente em breve.",
  INTERNAL_ERROR: "Erro interno. Já estamos verificando — tente novamente em instantes.",
};

function fieldFromLoc(loc: unknown[] | undefined): string | null {
  if (!Array.isArray(loc) || loc.length === 0) return null;
  const last = loc[loc.length - 1];
  return typeof last === "string" || typeof last === "number" ? String(last) : null;
}

function readRetryAfter(err: AxiosLikeError): number | null {
  const headers = err.response?.headers;
  let raw: string | null | undefined;
  if (headers && typeof (headers as { get?: unknown }).get === "function") {
    raw = (headers as { get: (k: string) => string | null }).get("retry-after");
  } else if (headers && typeof headers === "object") {
    raw = (headers as Record<string, string>)["retry-after"];
  }
  const detailRetry = (err.response?.data?.error?.details as { retry_after?: number } | undefined)
    ?.retry_after;
  const value = raw != null ? Number(raw) : detailRetry;
  return typeof value === "number" && !Number.isNaN(value) ? value : null;
}

// ─── API pública ───────────────────────────────────────────────────────────────

/**
 * Parseia qualquer erro (axios/fetch/desconhecido) em uma estrutura consistente.
 */
export function getApiError(err: unknown): ParsedApiError {
  const base: ParsedApiError = {
    message: DEFAULT_MESSAGE,
    code: "UNKNOWN",
    status: null,
    field: null,
    fieldErrors: {},
    retryAfter: null,
    isNetwork: false,
  };

  if (err == null) return base;

  const e = err as AxiosLikeError;

  // Sem response → erro de rede / timeout / cancelado
  if (!e.response) {
    const isTimeout = e.code === "ECONNABORTED" || /timeout/i.test(e.message ?? "");
    const isNetwork = !!e.request || e.code === "ERR_NETWORK" || /network/i.test(e.message ?? "");
    if (isTimeout) {
      return { ...base, code: "TIMEOUT", isNetwork: true, message: FRIENDLY_BY_CODE.TIMEOUT! };
    }
    if (isNetwork) {
      return {
        ...base,
        code: "NETWORK_ERROR",
        isNetwork: true,
        message: FRIENDLY_BY_CODE.NETWORK_ERROR!,
      };
    }
    if (typeof e.message === "string" && e.message) {
      return { ...base, message: e.message };
    }
    return base;
  }

  const status = e.response.status ?? null;
  const data = e.response.data;
  const retryAfter = readRetryAfter(e);

  if (!data) {
    return { ...base, status, retryAfter, message: statusFallback(status) };
  }

  // Formato unificado: { error: { code, message, field, details } }
  if (data.error && (data.error.message || data.error.code)) {
    const code = (data.error.code as ApiErrorCode) ?? "UNKNOWN";
    const fieldErrors = extractFieldErrors(data.error.details);
    return {
      message: data.error.message || FRIENDLY_BY_CODE[code] || statusFallback(status),
      code,
      status,
      field: data.error.field ?? null,
      fieldErrors,
      retryAfter,
      isNetwork: false,
    };
  }

  // FastAPI: { detail: string }
  if (typeof data.detail === "string") {
    return { ...base, status, retryAfter, message: data.detail };
  }

  // FastAPI: { detail: { message } }
  if (
    data.detail &&
    typeof data.detail === "object" &&
    !Array.isArray(data.detail) &&
    typeof (data.detail as { message?: string }).message === "string"
  ) {
    return { ...base, status, retryAfter, message: (data.detail as { message: string }).message };
  }

  // FastAPI validação: { detail: [{ msg, loc }] }
  if (Array.isArray(data.detail) && data.detail.length > 0) {
    const fieldErrors: Record<string, string> = {};
    for (const item of data.detail) {
      const f = fieldFromLoc(item.loc);
      const msg = item.msg ?? item.message;
      if (f && typeof msg === "string") fieldErrors[f] = msg;
    }
    const first = data.detail[0];
    const message = first?.msg ?? first?.message ?? statusFallback(status);
    return {
      ...base,
      code: "VALIDATION_ERROR",
      status,
      field: fieldFromLoc(first?.loc),
      fieldErrors,
      retryAfter,
      message: typeof message === "string" ? message : statusFallback(status),
    };
  }

  return { ...base, status, retryAfter, message: statusFallback(status) };
}

function extractFieldErrors(details: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (Array.isArray(details)) {
    for (const item of details as Array<{ msg?: string; loc?: unknown[] }>) {
      const f = fieldFromLoc(item.loc);
      if (f && typeof item.msg === "string") out[f] = item.msg;
    }
  }
  return out;
}

function statusFallback(status: number | null): string {
  if (status === 401) return FRIENDLY_BY_CODE.UNAUTHORIZED!;
  if (status === 403) return FRIENDLY_BY_CODE.FORBIDDEN!;
  if (status === 404) return FRIENDLY_BY_CODE.NOT_FOUND!;
  if (status === 429) return FRIENDLY_BY_CODE.RATE_LIMIT_EXCEEDED!;
  if (status != null && status >= 500) return FRIENDLY_BY_CODE.INTERNAL_ERROR!;
  return DEFAULT_MESSAGE;
}

/**
 * Mensagem amigável pronta para exibir (toast, alert, inline).
 */
export function getApiErrorMessage(err: unknown, fallback = DEFAULT_MESSAGE): string {
  const parsed = getApiError(err);
  return parsed.message || fallback;
}

/** Código de erro da API, se existir. */
export function getApiErrorCode(err: unknown): string | null {
  const code = getApiError(err).code;
  return code === "UNKNOWN" ? null : code;
}

/** Erros de validação por campo (útil para formulários). */
export function getFieldErrors(err: unknown): Record<string, string> {
  return getApiError(err).fieldErrors;
}

/** 401 — não autenticado / sessão expirada. */
export function isUnauthorized(err: unknown): boolean {
  return getApiError(err).status === 401;
}

/** 403 — sem permissão. */
export function isForbidden(err: unknown): boolean {
  return getApiError(err).status === 403;
}

/** 404 — recurso não encontrado. */
export function isNotFound(err: unknown): boolean {
  return getApiError(err).status === 404;
}

/** 409 / ALREADY_EXISTS — conflito. */
export function isConflict(err: unknown): boolean {
  const p = getApiError(err);
  return p.status === 409 || p.code === "ALREADY_EXISTS" || p.code === "CONFLICT";
}

/** Erro de rede / timeout (sem resposta do servidor). */
export function isNetworkError(err: unknown): boolean {
  return getApiError(err).isNetwork;
}

/** Erro do servidor (5xx). */
export function isServerError(err: unknown): boolean {
  const s = getApiError(err).status;
  return s != null && s >= 500;
}
