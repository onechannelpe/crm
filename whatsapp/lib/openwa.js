// Cliente del gateway OpenWA: resuelve el UUID de la sesión por su nombre y
// envía mensajes de texto. El engine de OpenWA se identifica por el UUID de la
// sesión (no por el nombre), por eso resolvemos el id en cada arranque.

export function createOpenWa({ baseUrl, apiKey, sessionName, countryCode }) {
  const base = baseUrl.replace(/\/+$/, "");
  const headers = {
    "content-type": "application/json",
    "x-api-key": apiKey,
  };

  // Convierte un número guardado en el CRM a un chatId de WhatsApp (xxxx@c.us).
  // Acepta números locales de 9 dígitos (se les antepone el código de país) o
  // números que ya incluyen el código de país.
  function toChatId(rawAddress) {
    const digits = String(rawAddress).replace(/\D/g, "");
    if (!digits) return null;
    const cc = String(countryCode).replace(/\D/g, "");
    const withCc = digits.startsWith(cc) ? digits : `${cc}${digits}`;
    return `${withCc}@c.us`;
  }

  async function listSessions() {
    const res = await fetch(`${base}/api/sessions`, { headers });
    if (!res.ok) {
      throw new Error(`OpenWA /sessions HTTP ${res.status}: ${await res.text()}`);
    }
    return res.json();
  }

  // Devuelve { id, status } de la sesión configurada, o null si no existe.
  async function resolveSession() {
    const sessions = await listSessions();
    const match = sessions.find((s) => s.name === sessionName);
    return match ? { id: match.id, status: match.status } : null;
  }

  // Lee los mensajes recientes de la sesión (todas las direcciones). Devuelve
  // un array (vacío si falla), ordenado como lo entregue OpenWA.
  async function getMessages(sessionId, limit = 30) {
    try {
      const res = await fetch(
        `${base}/api/sessions/${sessionId}/messages?limit=${limit}`,
        { headers },
      );
      if (!res.ok) return [];
      const body = await res.json();
      return Array.isArray(body?.messages) ? body.messages : [];
    } catch {
      return [];
    }
  }

  // Verifica si un número existe en WhatsApp (anti-spam: no enviar a números
  // que no están en WhatsApp). Devuelve true/false, o null si no se pudo saber.
  async function numberExists(sessionId, rawAddress) {
    const digits = String(rawAddress).replace(/\D/g, "");
    const cc = String(countryCode).replace(/\D/g, "");
    const number = digits.startsWith(cc) ? digits : `${cc}${digits}`;
    try {
      const res = await fetch(
        `${base}/api/sessions/${sessionId}/contacts/check/${number}`,
        { headers },
      );
      if (!res.ok) return null;
      const body = await res.json();
      return Boolean(body?.exists);
    } catch {
      return null;
    }
  }

  // Envía un indicador de presencia ("escribiendo…"/"grabando…") al chat.
  // Best-effort: nunca lanza, para no bloquear el envío real si falla.
  async function sendTyping(sessionId, chatId, state = "typing") {
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
  async function sendText(sessionId, chatId, text) {
    const res = await fetch(
      `${base}/api/sessions/${sessionId}/messages/send-text`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ chatId, text }),
      },
    );
    let body;
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
