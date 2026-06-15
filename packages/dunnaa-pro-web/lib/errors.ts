/**
 * Extrai mensagem amigável de erro a partir da resposta da API.
 * Suporta formato unificado {"error": {"code", "message"}} e legado {"detail": string | array}.
 */
export function getApiErrorMessage(err: unknown, fallback = "Algo deu errado. Tente novamente."): string {
  if (err == null) return fallback;

  const anyErr = err as {
    response?: {
      status?: number;
      data?: {
        error?: { message?: string; code?: string };
        detail?: string | { message?: string } | Array<{ msg?: string; message?: string; loc?: unknown }>;
      };
    };
    message?: string;
  };

  const data = anyErr.response?.data;
  if (!data) {
    if (typeof anyErr.message === "string" && anyErr.message) return anyErr.message;
    return fallback;
  }

  // Formato unificado da API: { error: { code, message } }
  if (data.error && typeof data.error.message === "string") {
    return data.error.message;
  }

  // FastAPI: { detail: string } ou { detail: { message: string } }
  if (typeof data.detail === "string") {
    return data.detail;
  }
  if (data.detail && typeof data.detail === "object" && !Array.isArray(data.detail) && typeof (data.detail as { message?: string }).message === "string") {
    return (data.detail as { message: string }).message;
  }

  // Validação: { detail: [{ msg, loc }] }
  if (Array.isArray(data.detail) && data.detail.length > 0) {
    const first = data.detail[0];
    const msg = first?.msg ?? first?.message;
    if (typeof msg === "string") return msg;
  }

  return fallback;
}

/**
 * Retorna o código de erro da API, se existir.
 */
export function getApiErrorCode(err: unknown): string | null {
  const anyErr = err as { response?: { data?: { error?: { code?: string } } } };
  return anyErr.response?.data?.error?.code ?? null;
}

/**
 * Verifica se o erro é de autenticação (401).
 */
export function isUnauthorized(err: unknown): boolean {
  const anyErr = err as { response?: { status?: number } };
  return anyErr.response?.status === 401;
}
