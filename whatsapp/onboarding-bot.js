// ─────────────────────────────────────────────────────────────────────────
//  Bot de onboarding (opt-in anti-baneo)
//
//  Cuando una persona le escribe PRIMERO al número del bot (lo que abre la
//  conversación y es la mejor práctica anti-baneo de WhatsApp), este servicio
//  responde con un saludo, le pide su nombre y confirma que ese número ya puede
//  recibir notificaciones del CRM.
//
//  Flujo:
//    1) La persona escribe cualquier cosa  → Bot: saludo + "¿cuál es tu nombre?"
//    2) La persona responde su nombre       → Bot: "¡Genial {nombre}! ... recuerda decir gracias"
//    3) La persona dice "gracias"           → Bot: confirmación final
//
//  No modifica el CRM ni OpenWA: solo lee mensajes y responde vía el API de OpenWA.
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { createOpenWa } from "./lib/openwa.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  process.loadEnvFile(join(__dirname, ".env"));
} catch {
  /* sin .env */
}

const cfg = {
  openwaBaseUrl: process.env.OPENWA_BASE_URL ?? "http://localhost:2785",
  openwaApiKey: process.env.OPENWA_API_KEY ?? "",
  sessionName: process.env.OPENWA_SESSION_NAME ?? "crm-notify",
  pollIntervalMs: Number(process.env.ONBOARDING_POLL_MS ?? 3500),
  typingSec: Number(process.env.TYPING_SEC ?? 1),
  brand: process.env.BRAND_NAME ?? "CRM ProSolutions",
};

// ── Textos del bot (puedes editarlos a tu gusto) ───────────────────────────
const MSG = {
  welcome: () =>
    `¡Hola! 👋 Bienvenido/a a *${cfg.brand}*.\n\n` +
    `Antes de empezar, ¿me puedes decir tu *nombre*?`,
  askNameAgain: () =>
    `No te entendí bien 🙈. ¿Me escribes tu *nombre*, por favor?`,
  confirmed: (name) =>
    `¡Genial${name ? `, ${name}` : ""}! 🎉\n\n` +
    `Este número ya puede recibir notificaciones de *${cfg.brand}*.\n\n` +
    `Para terminar de activarlo, recuerda responder *gracias* 🙏`,
  thanks: () =>
    `¡Con gusto! 🙌 Quedaste activado/a.\n\n` +
    `A partir de ahora te llegarán aquí tus notificaciones de *${cfg.brand}*.`,
};

const STATE_FILE = join(__dirname, ".onboarding.json");
const PROCESSED_CAP = 500;

const openwa = createOpenWa({
  baseUrl: cfg.openwaBaseUrl,
  apiKey: cfg.openwaApiKey,
  sessionName: cfg.sessionName,
  countryCode: process.env.COUNTRY_CODE ?? "51",
});

function log(level, msg, extra) {
  const ts = new Date().toISOString();
  const tail = extra ? ` ${JSON.stringify(extra)}` : "";
  console.log(`[${ts}] ${level} ${msg}${tail}`);
}

// ── Estado ─────────────────────────────────────────────────────────────────
// processedIds: ids de mensajes ya atendidos (evita responder dos veces).
// contacts: { "<chatId>": { stage, name, updatedAt } }
//   stage: "asked_name" | "await_thanks" | "done"
function loadState() {
  const base = { processedIds: [], contacts: {} };
  if (!existsSync(STATE_FILE)) return base;
  try {
    return { ...base, ...JSON.parse(readFileSync(STATE_FILE, "utf8")) };
  } catch {
    return base;
  }
}
function saveState(state) {
  if (state.processedIds.length > PROCESSED_CAP) {
    state.processedIds = state.processedIds.slice(-PROCESSED_CAP);
  }
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

const state = loadState();

// ── Sesión ─────────────────────────────────────────────────────────────────
let sessionId = null;
async function ensureSession() {
  if (sessionId) return sessionId;
  const session = await openwa.resolveSession();
  if (!session) {
    throw new Error(`No existe la sesión OpenWA "${cfg.sessionName}".`);
  }
  sessionId = session.id;
  if (!["ready", "connected"].includes(session.status)) {
    log("WARN", `Sesión "${cfg.sessionName}" en estado "${session.status}" (no operativa).`);
  } else {
    log("INFO", "Sesión OpenWA lista", { sessionId, status: session.status });
  }
  return sessionId;
}

// ── Responder (con "escribiendo…" para parecer humano) ─────────────────────
async function reply(sid, chatId, text) {
  if (cfg.typingSec > 0) {
    await openwa.sendTyping(sid, chatId, "typing");
    await new Promise((r) => setTimeout(r, cfg.typingSec * 1000 + 800));
  }
  const res = await openwa.sendText(sid, chatId, text);
  if (!res.ok) {
    log("ERROR", "No se pudo responder", { chatId, status: res.status, body: res.body });
  }
  return res.ok;
}

// ¿Es un chat individual de persona? (descarta grupos y difusiones)
function isIndividualChat(chatId) {
  if (!chatId) return false;
  if (chatId.includes("@g.us")) return false; // grupo
  if (chatId.includes("status@broadcast")) return false;
  return true;
}

function looksLikeThanks(body) {
  return /gracias|thank|grcias|graciass/i.test(body ?? "");
}

// Limpia el nombre recibido (toma las primeras palabras, sin emojis raros).
function cleanName(body) {
  const t = (body ?? "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  // Tomamos hasta 3 palabras como nombre.
  return t.split(" ").slice(0, 3).join(" ").slice(0, 40);
}

// ── Procesa un mensaje entrante según el estado del contacto ────────────────
async function handleIncoming(sid, m) {
  const chatId = m.chatId;
  const body = (m.body ?? "").trim();
  const contact = state.contacts[chatId];

  // Primer contacto: saludar y pedir nombre.
  if (!contact) {
    const ok = await reply(sid, chatId, MSG.welcome());
    if (ok) {
      state.contacts[chatId] = { stage: "asked_name", name: null, updatedAt: Date.now() };
      log("INFO", "Onboarding iniciado", { chatId });
    }
    return;
  }

  if (contact.stage === "asked_name") {
    const name = cleanName(body);
    if (!name) {
      await reply(sid, chatId, MSG.askNameAgain());
      return;
    }
    const ok = await reply(sid, chatId, MSG.confirmed(name));
    if (ok) {
      contact.name = name;
      contact.stage = "await_thanks";
      contact.updatedAt = Date.now();
      log("INFO", "Nombre recibido, activación pendiente de 'gracias'", { chatId, name });
    }
    return;
  }

  if (contact.stage === "await_thanks") {
    if (looksLikeThanks(body)) {
      const ok = await reply(sid, chatId, MSG.thanks());
      if (ok) {
        contact.stage = "done";
        contact.updatedAt = Date.now();
        log("INFO", "Onboarding completado", { chatId, name: contact.name });
      }
    }
    // Si no dice "gracias", no respondemos (evita spam); sigue en await_thanks.
    return;
  }

  // stage === "done": ya está; no respondemos a mensajes posteriores.
}

// ── Loop ───────────────────────────────────────────────────────────────────
async function tick() {
  const sid = await ensureSession();
  const messages = await openwa.getMessages(sid, 30);

  // Más antiguos primero, solo entrantes de chats individuales no procesados.
  const pending = messages
    .filter(
      (m) =>
        m.direction === "incoming" &&
        isIndividualChat(m.chatId) &&
        !state.processedIds.includes(m.id),
    )
    .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

  for (const m of pending) {
    try {
      await handleIncoming(sid, m);
    } catch (err) {
      log("ERROR", "Error atendiendo mensaje", {
        chatId: m.chatId,
        error: String(err?.message ?? err),
      });
    }
    state.processedIds.push(m.id);
    saveState(state);
  }
}

async function main() {
  log("INFO", "Iniciando bot de onboarding", {
    session: cfg.sessionName,
    brand: cfg.brand,
    pollIntervalMs: cfg.pollIntervalMs,
  });
  if (!cfg.openwaApiKey) {
    log("ERROR", "Falta OPENWA_API_KEY en el .env. Abortando.");
    process.exit(1);
  }

  // En el primer arranque, marca como ya procesados los mensajes existentes
  // para NO responder a conversaciones viejas (solo atiende mensajes nuevos).
  if (state.processedIds.length === 0) {
    try {
      const sid = await ensureSession();
      const existing = await openwa.getMessages(sid, 30);
      state.processedIds = existing.map((m) => m.id);
      saveState(state);
      log("INFO", "Historial marcado como visto; solo se atenderán mensajes nuevos.", {
        vistos: state.processedIds.length,
      });
    } catch (err) {
      log("WARN", "No se pudo prelistar el historial", {
        error: String(err?.message ?? err),
      });
    }
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await tick();
    } catch (err) {
      log("ERROR", "Error en el ciclo", { error: String(err?.message ?? err) });
    }
    await new Promise((r) => setTimeout(r, cfg.pollIntervalMs));
  }
}

main().catch((err) => {
  log("ERROR", "Fallo fatal", { error: String(err?.stack ?? err) });
  process.exit(1);
});
