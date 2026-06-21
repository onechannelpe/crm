// Cliente del gateway OpenWA: resuelve el UUID de la sesión por su nombre y
// envía mensajes de texto. El engine de OpenWA se identifica por el UUID de la
// sesión (no por el nombre), por eso resolvemos el id en cada arranque.

export interface OpenWaSession {
  id: string;
  name: string;
  status: string;
  phone?: string | null;
}

export interface OpenWaMessage {
  id: string;
  chatId: string;
  from: string;
  to?: string;
  body: string;
  direction: "incoming" | "outgoing";
  timestamp: number;
  status?: string;
}

export interface SendResult {
  ok: boolean;
  status: number;
  body: unknown;
}

export interface OpenWa {
  toChatId(rawAddress: string): string | null;
  listSessions(): Promise<OpenWaSession[]>;
  resolveSession(): Promise<{ id: string; status: string } | null>;
  getMessages(sessionId: string, limit?: number): Promise<OpenWaMessage[]>;
  numberExists(sessionId: string, rawAddress: string): Promise<boolean | null>;
  sendTyping(sessionId: string, chatId: string, state?: string): Promise<void>;
  sendText(
    sessionId: string,
    chatId: string,
    text: string,
  ): Promise<SendResult>;
}

export function createOpenWa(opts: {
  baseUrl: string;
  apiKey: string;
  sessionName: string;
  countryCode: string;
}): OpenWa {
  const base = opts.baseUrl.replace(/\/+$/, "");
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-api-key": opts.apiKey,
  };

  // Convierte un número guardado en el CRM a un chatId de WhatsApp (xxxx@c.us).
  // Acepta números locales de 9 dígitos (se les antepone el código de país) o
  // números que ya incluyen el código de país.
  function toChatId(rawAddress: string): string | null {
    const digits = String(rawAddress).replace(/\D/g, "");
    if (!digits) return null;
    const cc = String(opts.countryCode).replace(/\D/g, "");
    const withCc = digits.startsWith(cc) ? digits : `${cc}${digits}`;
    return `${withCc}@c.us`;
  }

  async function listSessions(): Promise<OpenWaSession[]> {
    const res = await fetch(`${base}/api/sessions`, { headers });
    if (!res.ok) {
      throw new Error(
        `OpenWA /sessions HTTP ${res.status}: ${await res.text()}`,
      );
    }
    return (await res.json()) as OpenWaSession[];
  }

  // Devuelve { id, status } de la sesión configurada, o null si no existe.
  async function resolveSession(): Promise<{
    id: string;
    status: string;
  } | null> {
    const sessions = await listSessions();
    const match = sessions.find((s) => s.name === opts.sessionName);
    return match ? { id: match.id, status: match.status } : null;
  }

  // Lee los mensajes recientes de la sesión (todas las direcciones).
  async function getMessages(
    sessionId: string,
    limit = 30,
  ): Promise<OpenWaMessage[]> {
    try {
      const res = await fetch(
        `${base}/api/sessions/${sessionId}/messages?limit=${limit}`,
        { headers },
      );
      if (!res.ok) return [];
      const body = (await res.json()) as { messages?: OpenWaMessage[] };
      return Array.isArray(body?.messages) ? body.messages : [];
    } catch {
      return [];
    }
  }

  // Verifica si un número existe en WhatsApp. Devuelve true/false, o null si no
  // se pudo determinar.
  async function numberExists(
    sessionId: string,
    rawAddress: string,
  ): Promise<boolean | null> {
    const digits = String(rawAddress).replace(/\D/g, "");
    const cc = String(opts.countryCode).replace(/\D/g, "");
    const number = digits.startsWith(cc) ? digits : `${cc}${digits}`;
    try {
      const res = await fetch(
        `${base}/api/sessions/${sessionId}/contacts/check/${number}`,
        { headers },
      );
      if (!res.ok) return null;
      const body = (await res.json()) as { exists?: boolean };
      return Boolean(body?.exists);
    } catch {
      return null;
    }
  }

  // Envía un indicador de presencia ("escribiendo…"/"grabando…") al chat.
  async function sendTyping(
    sessionId: string,
    chatId: string,
    state = "typing",
  ): Promise<void> {
    try {
      await fetch(`${base}/api/sessions/${sessionId}/chats/typing`, {
        method: "POST",
        headers,
        body: JSON.stringify({ chatId, state }),
      });
    } catch {
      /* ignorar: la presencia es decorativa */
    }
  }

  // Envía texto. Devuelve { ok, status, body }.
  async function sendText(
    sessionId: string,
    chatId: string,
    text: string,
  ): Promise<SendResult> {
    const res = await fetch(
      `${base}/api/sessions/${sessionId}/messages/send-text`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ chatId, text }),
      },
    );
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    return { ok: res.ok, status: res.status, body };
  }

  return {
    toChatId,
    listSessions,
    resolveSession,
    getMessages,
    numberExists,
    sendTyping,
    sendText,
  };
}
