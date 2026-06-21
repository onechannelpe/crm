// ─────────────────────────────────────────────────────────────────────────
//  CRM → WhatsApp notifier
//
//  Vigila la tabla `app_notifications` del CRM (lo que aparece en el panel web)
//  y reenvía cada notificación NUEVA de un ejecutivo a su WhatsApp vía OpenWA.
//
//  No modifica el CRM: solo LEE su base de datos libsql y usa el API de OpenWA.
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createLibsql } from "./lib/libsql.ts";
import { createOpenWa } from "./lib/openwa.ts";

const moduleDir = dirname(fileURLToPath(import.meta.url));

// Carga el .env (Node >= 20.6 / bun). Si no existe, seguimos con el entorno.
try {
  process.loadEnvFile(join(moduleDir, ".env"));
} catch {
  /* sin .env: se usan variables de entorno del proceso */
}

interface Config {
  webDbUrl: string;
  webDbAuthToken?: string;
  openwaBaseUrl: string;
  openwaApiKey: string;
  sessionName: string;
  pollIntervalMs: number;
  targetRole: string;
  countryCode: string;
  startFrom: string;
  crmBaseUrl: string;
  dryRun: boolean;
  minDelaySec: number;
  maxDelaySec: number;
  maxPerHour: number;
  maxPerDay: number;
  typingSec: number;
  verifyNumber: boolean;
  quietHours: string;
}

const cfg: Config = {
  webDbUrl: process.env.WEB_DB_URL ?? "http://127.0.0.1:8080",
  webDbAuthToken: process.env.WEB_DB_AUTH_TOKEN || undefined,
  openwaBaseUrl: process.env.OPENWA_BASE_URL ?? "http://localhost:2785",
  openwaApiKey: process.env.OPENWA_API_KEY ?? "",
  sessionName: process.env.OPENWA_SESSION_NAME ?? "crm-notify",
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 4000),
  targetRole: process.env.TARGET_ROLE ?? "executive",
  countryCode: process.env.COUNTRY_CODE ?? "51",
  startFrom: (process.env.START_FROM ?? "now").toLowerCase(),
  crmBaseUrl: (process.env.CRM_BASE_URL ?? "").replace(/\/+$/, ""),
  dryRun: String(process.env.DRY_RUN ?? "false").toLowerCase() === "true",
  minDelaySec: Number(process.env.MIN_DELAY_SEC ?? 45),
  maxDelaySec: Number(process.env.MAX_DELAY_SEC ?? 150),
  maxPerHour: Number(process.env.MAX_PER_HOUR ?? 15),
  maxPerDay: Number(process.env.MAX_PER_DAY ?? 120),
  typingSec: Number(process.env.TYPING_SEC ?? 3),
  verifyNumber:
    String(process.env.VERIFY_NUMBER ?? "true").toLowerCase() === "true",
  quietHours: (process.env.QUIET_HOURS ?? "").trim(),
};

interface State {
  lastId: number | null;
  sentTimes: number[];
  nextSendAt: number;
}

interface NotificationRow extends Record<string, string | number | null> {
  id: number;
  user_id: number;
  title: string;
  body_text: string;
  action_url: string | null;
  event_type: string;
  priority: string;
  address: string;
}

type Outcome = "sent" | "retry" | "dropped";

const STATE_FILE = join(moduleDir, ".state.json");
const MAX_ATTEMPTS = 3; // reintentos por notificación antes de descartarla
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const db = createLibsql({ url: cfg.webDbUrl, authToken: cfg.webDbAuthToken });
const openwa = createOpenWa({
  baseUrl: cfg.openwaBaseUrl,
  apiKey: cfg.openwaApiKey,
  sessionName: cfg.sessionName,
  countryCode: cfg.countryCode,
});

function log(level: string, msg: string, extra?: unknown): void {
  const ts = new Date().toISOString();
  const tail = extra ? ` ${JSON.stringify(extra)}` : "";
  console.log(`[${ts}] ${level} ${msg}${tail}`);
}

// ── Estado (watermark + ritmo de envío) ────────────────────────────────────
function loadState(): State {
  const base: State = { lastId: null, sentTimes: [], nextSendAt: 0 };
  if (!existsSync(STATE_FILE)) return base;
  try {
    return {
      ...base,
      ...(JSON.parse(readFileSync(STATE_FILE, "utf8")) as State),
    };
  } catch {
    return base;
  }
}
function saveState(s: State): void {
  writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

// ── Helpers de ritmo (anti-baneo) ──────────────────────────────────────────
function randomBetween(minMs: number, maxMs: number): number {
  if (maxMs <= minMs) return minMs;
  return minMs + Math.floor(Math.random() * (maxMs - minMs + 1));
}

function pruneSentTimes(now: number): void {
  state.sentTimes = (state.sentTimes ?? []).filter((t) => now - t < DAY_MS);
}

// Devuelve un motivo de bloqueo o null si se puede enviar ahora.
function throttleReason(now: number): string | null {
  if (isQuietNow(now)) return "quiet_hours";
  if (now < (state.nextSendAt ?? 0)) return "cooldown";
  pruneSentTimes(now);
  if (cfg.maxPerHour > 0) {
    const inHour = state.sentTimes.filter((t) => now - t < HOUR_MS).length;
    if (inHour >= cfg.maxPerHour) return "hourly_cap";
  }
  if (cfg.maxPerDay > 0 && state.sentTimes.length >= cfg.maxPerDay) {
    return "daily_cap";
  }
  return null;
}

// ¿Estamos dentro del horario silencioso? Soporta rangos que cruzan medianoche.
function isQuietNow(now: number): boolean {
  if (!cfg.quietHours) return false;
  const m = cfg.quietHours.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
  if (!m) return false;
  const start = Number(m[1]) * 60 + Number(m[2]);
  const end = Number(m[3]) * 60 + Number(m[4]);
  const d = new Date(now);
  const cur = d.getHours() * 60 + d.getMinutes();
  return start <= end ? cur >= start && cur < end : cur >= start || cur < end;
}

// ── Consultas ──────────────────────────────────────────────────────────────
async function fetchNextNotification(
  lastId: number | null,
): Promise<NotificationRow | null> {
  const rows = await db.query<NotificationRow>(
    `SELECT n.id          AS id,
            n.user_id      AS user_id,
            n.title        AS title,
            n.body_text    AS body_text,
            n.action_url   AS action_url,
            n.event_type   AS event_type,
            n.priority     AS priority,
            a.address      AS address
       FROM app_notifications n
       JOIN users u
         ON u.id = n.user_id
       JOIN user_channel_addresses a
         ON a.user_id = n.user_id
        AND a.channel = 'whatsapp'
        AND a.is_verified = 1
      WHERE n.id > ?
        AND u.role = ?
      ORDER BY n.id ASC
      LIMIT 1`,
    [lastId ?? 0, cfg.targetRole],
  );
  return rows[0] ?? null;
}

async function countPending(lastId: number | null): Promise<number> {
  const rows = await db.query<{ c: number }>(
    `SELECT COUNT(*) AS c
       FROM app_notifications n
       JOIN users u ON u.id = n.user_id
       JOIN user_channel_addresses a
         ON a.user_id = n.user_id AND a.channel = 'whatsapp' AND a.is_verified = 1
      WHERE n.id > ? AND u.role = ?`,
    [lastId ?? 0, cfg.targetRole],
  );
  return rows[0]?.c ?? 0;
}

async function currentMaxId(): Promise<number> {
  const rows = await db.query<{ max_id: number }>(
    "SELECT COALESCE(MAX(id), 0) AS max_id FROM app_notifications",
  );
  return rows[0]?.max_id ?? 0;
}

// ── Composición del mensaje de WhatsApp ────────────────────────────────────
function buildMessage(n: NotificationRow): string {
  let text = `*${n.title}*\n${n.body_text}`;
  if (cfg.crmBaseUrl && n.action_url) {
    const path = n.action_url.startsWith("/")
      ? n.action_url
      : `/${n.action_url}`;
    text += `\n\n${cfg.crmBaseUrl}${path}`;
  }
  return text;
}

// ── Resolución de la sesión de OpenWA ──────────────────────────────────────
let sessionId: string | null = null;
async function ensureSession(): Promise<string> {
  if (sessionId) return sessionId;
  const session = await openwa.resolveSession();
  if (!session) {
    throw new Error(
      `No existe una sesión OpenWA llamada "${cfg.sessionName}". Revisa OPENWA_SESSION_NAME.`,
    );
  }
  sessionId = session.id;
  const READY_STATES = new Set(["ready", "connected"]);
  if (!READY_STATES.has(session.status)) {
    log(
      "WARN",
      `La sesión "${cfg.sessionName}" está en estado "${session.status}" (no operativa). ` +
        `Escanea el QR en OpenWA; mientras tanto los envíos fallarán.`,
    );
  } else {
    log("INFO", `Sesión OpenWA lista`, { sessionId, status: session.status });
  }
  return sessionId;
}

// ── Envío de una notificación ──────────────────────────────────────────────
const attempts = new Map<number, number>();

async function deliver(n: NotificationRow): Promise<Outcome> {
  const chatId = openwa.toChatId(n.address);
  if (!chatId) {
    log("ERROR", "Dirección inválida, se descarta", {
      id: n.id,
      address: n.address,
    });
    return "dropped";
  }
  const text = buildMessage(n);

  if (cfg.dryRun) {
    log("DRY", "Enviaría WhatsApp", {
      id: n.id,
      userId: n.user_id,
      chatId,
      text,
    });
    return "sent";
  }

  let result: { ok: boolean; status: number; body: unknown };
  try {
    const sid = await ensureSession();

    // Anti-spam: no enviar a números que no están en WhatsApp.
    if (cfg.verifyNumber) {
      const exists = await openwa.numberExists(sid, n.address);
      if (exists === false) {
        log("WARN", "El número no está en WhatsApp, se descarta", {
          id: n.id,
          userId: n.user_id,
          address: n.address,
        });
        return "dropped";
      }
      // exists === null (no se pudo verificar): continúa e intenta enviar.
    }

    // Simular "escribiendo…" un rato antes de enviar (comportamiento humano).
    if (cfg.typingSec > 0) {
      await openwa.sendTyping(sid, chatId, "typing");
      const typingMs = randomBetween(
        cfg.typingSec * 1000,
        cfg.typingSec * 1000 + 2000,
      );
      await new Promise((r) => setTimeout(r, typingMs));
    }
    result = await openwa.sendText(sid, chatId, text);
  } catch (err) {
    result = {
      ok: false,
      status: 0,
      body: String((err as Error)?.message ?? err),
    };
  }

  if (result.ok) {
    log("INFO", "WhatsApp enviado", { id: n.id, userId: n.user_id, chatId });
    attempts.delete(n.id);
    return "sent";
  }

  // Si la sesión dejó de existir (UUID viejo), fuerza re-resolución.
  if (result.status === 404) sessionId = null;

  // Rate-limit del gateway: respeta un enfriamiento largo antes de reintentar.
  if (result.status === 429) {
    state.nextSendAt = Date.now() + cfg.maxDelaySec * 1000 * 2;
    log("WARN", "Rate-limit (429): enfriando antes de reintentar", {
      id: n.id,
      enSeg: cfg.maxDelaySec * 2,
    });
  }

  const failed = (attempts.get(n.id) ?? 0) + 1;
  attempts.set(n.id, failed);
  log("ERROR", "Fallo al enviar WhatsApp", {
    id: n.id,
    chatId,
    status: result.status,
    attempt: failed,
    body: result.body,
  });

  if (failed >= MAX_ATTEMPTS) {
    log("WARN", "Notificación descartada tras agotar reintentos", { id: n.id });
    attempts.delete(n.id);
    return "dropped";
  }
  return "retry";
}

// ── Loop principal ─────────────────────────────────────────────────────────
const state: State = loadState();

async function bootstrapWatermark(): Promise<void> {
  if (state.lastId !== null && state.lastId !== undefined) return;
  if (cfg.startFrom === "beginning") {
    state.lastId = 0;
    log(
      "INFO",
      "Arranque desde el inicio: se reenviará el historial pendiente.",
    );
  } else {
    state.lastId = await currentMaxId();
    log("INFO", "Arranque en 'now': se ignora el historial.", {
      desdeId: state.lastId,
    });
  }
  saveState(state);
}

let lastThrottleLog = 0;
async function tick(): Promise<void> {
  await bootstrapWatermark();

  const next = await fetchNextNotification(state.lastId);
  if (!next) return; // cola vacía

  const now = Date.now();

  if (!cfg.dryRun) {
    const reason = throttleReason(now);
    if (reason) {
      if (now - lastThrottleLog > 30_000) {
        const pending = await countPending(state.lastId);
        const waitMs = Math.max(0, (state.nextSendAt ?? 0) - now);
        log("INFO", "En cola, esperando turno", {
          motivo: reason,
          enCola: pending,
          proximoEnSeg:
            reason === "cooldown" ? Math.ceil(waitMs / 1000) : undefined,
        });
        lastThrottleLog = now;
      }
      return;
    }
  }

  const outcome = await deliver(next);

  if (outcome === "retry") return;

  state.lastId = next.id;

  if (outcome === "sent" && !cfg.dryRun) {
    state.sentTimes = state.sentTimes ?? [];
    state.sentTimes.push(Date.now());
    pruneSentTimes(Date.now());
    const gap = randomBetween(cfg.minDelaySec * 1000, cfg.maxDelaySec * 1000);
    state.nextSendAt = Date.now() + gap;
    const pending = await countPending(state.lastId);
    log("INFO", "Programado el próximo envío", {
      enSeg: Math.round(gap / 1000),
      enCola: pending,
    });
  }

  saveState(state);
}

async function main(): Promise<void> {
  log("INFO", "Iniciando CRM → WhatsApp notifier", {
    webDbUrl: cfg.webDbUrl,
    openwaBaseUrl: cfg.openwaBaseUrl,
    session: cfg.sessionName,
    targetRole: cfg.targetRole,
    dryRun: cfg.dryRun,
    antiBaneo: {
      esperaSeg: `${cfg.minDelaySec}-${cfg.maxDelaySec}`,
      maxPorHora: cfg.maxPerHour,
      maxPorDia: cfg.maxPerDay,
      tipeoSeg: cfg.typingSec,
      horarioSilencioso: cfg.quietHours || "24/7",
      verificaNumero: cfg.verifyNumber,
    },
  });

  if (!cfg.openwaApiKey) {
    log("ERROR", "Falta OPENWA_API_KEY en el .env. Abortando.");
    process.exit(1);
  }

  try {
    await ensureSession();
  } catch (err) {
    log("WARN", "No se pudo resolver la sesión OpenWA todavía", {
      error: String((err as Error)?.message ?? err),
    });
  }

  // Loop de sondeo: cada iteración depende de la anterior (espera el tick y la
  // pausa), por lo que el await secuencial es intencional.
  /* eslint-disable no-await-in-loop */
  for (;;) {
    try {
      await tick();
    } catch (err) {
      log("ERROR", "Error en el ciclo de sondeo", {
        error: String((err as Error)?.message ?? err),
      });
    }
    await new Promise((r) => setTimeout(r, cfg.pollIntervalMs));
  }
  /* eslint-enable no-await-in-loop */
}

main().catch((err: unknown) => {
  log("ERROR", "Fallo fatal", { error: String((err as Error)?.stack ?? err) });
  process.exit(1);
});
