import { createLogger } from "../logger";

const DIAGNOSTIC_CHANNELS = ["requests", "ssr", "hydration"] as const;

export type DiagnosticChannel = (typeof DIAGNOSTIC_CHANNELS)[number];
export type DiagnosticMeta = Record<string, unknown>;

const loggerByScope = new Map<string, ReturnType<typeof createLogger>>();

function readImportMetaEnv(): Record<string, unknown> | undefined {
  const metaEnv = (import.meta as { env?: Record<string, unknown> }).env;
  return metaEnv && typeof metaEnv === "object" ? metaEnv : undefined;
}

function readServerEnv(key: string): string | undefined {
  if (typeof process === "undefined" || typeof process.env === "undefined") {
    return undefined;
  }

  const value = process.env[key];
  return typeof value === "string" ? value : undefined;
}

function readClientEnv(key: string): string | undefined {
  const value = readImportMetaEnv()?.[`VITE_${key}`];
  return typeof value === "string" ? value : undefined;
}

function readRuntimeEnv(key: string): string | undefined {
  return readServerEnv(key) ?? readClientEnv(key);
}

function parseCsv(raw: string | undefined): Set<string> {
  if (!raw) return new Set();

  return new Set(
    raw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0),
  );
}

function isDiagnosticChannel(value: string): value is DiagnosticChannel {
  return (DIAGNOSTIC_CHANNELS as readonly string[]).includes(value);
}

function getEnabledChannels(): Set<DiagnosticChannel> {
  const configured = parseCsv(readRuntimeEnv("DEBUG_DIAGNOSTICS"));

  if (configured.has("*") || configured.has("all")) {
    return new Set(DIAGNOSTIC_CHANNELS);
  }

  return new Set(
    Array.from(configured).filter((value): value is DiagnosticChannel =>
      isDiagnosticChannel(value),
    ),
  );
}

function getScopeFilter(): Set<string> {
  return parseCsv(readRuntimeEnv("DEBUG_DIAGNOSTICS_FILTER"));
}

const enabledChannels = getEnabledChannels();
const scopeFilter = getScopeFilter();

function normalizeMetaValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  return value;
}

function normalizeMeta(meta: DiagnosticMeta): DiagnosticMeta {
  return Object.fromEntries(
    Object.entries(meta).map(([key, value]) => [
      key,
      normalizeMetaValue(value),
    ]),
  );
}

export function getDiagnosticRuntime(): "server" | "client" {
  return typeof window === "undefined" ? "server" : "client";
}

function getLogger(scope: string) {
  const cached = loggerByScope.get(scope);
  if (cached) return cached;

  const logger = createLogger(`diagnostic:${scope}`);
  loggerByScope.set(scope, logger);
  return logger;
}

export function isDiagnosticEnabled(
  channel: DiagnosticChannel,
  scope: string,
): boolean {
  if (!enabledChannels.has(channel)) return false;
  if (scopeFilter.size === 0) return true;

  const normalizedScope = scope.toLowerCase();
  return (
    scopeFilter.has(normalizedScope) ||
    scopeFilter.has(`${channel}:${normalizedScope}`)
  );
}

export function traceDiagnostic(
  scope: string,
  channel: DiagnosticChannel,
  event: string,
  meta: DiagnosticMeta = {},
) {
  if (!isDiagnosticEnabled(channel, scope)) return;

  getLogger(scope).info(
    event,
    normalizeMeta({
      diagnostic: true,
      channel,
      scope,
      runtime: getDiagnosticRuntime(),
      ...meta,
    }),
  );
}

export async function traceDiagnosticAsync<T>(
  scope: string,
  channel: DiagnosticChannel,
  event: string,
  run: () => Promise<T>,
  meta: DiagnosticMeta = {},
): Promise<T> {
  if (!isDiagnosticEnabled(channel, scope)) {
    return run();
  }

  const startedAt = Date.now();
  traceDiagnostic(scope, channel, `${event}_start`, meta);

  try {
    const result = await run();
    traceDiagnostic(scope, channel, `${event}_complete`, {
      ...meta,
      durationMs: Date.now() - startedAt,
    });
    return result;
  } catch (error) {
    traceDiagnostic(scope, channel, `${event}_error`, {
      ...meta,
      durationMs: Date.now() - startedAt,
      error,
    });
    throw error;
  }
}

export function isHydrationMismatchError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  return error.message.toLowerCase().includes("hydration mismatch");
}
