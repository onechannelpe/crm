import { createLogger } from "./logger";

const DIAGNOSTIC_CHANNELS = ["requests", "ssr", "hydration"] as const;

export type DiagnosticChannel = (typeof DIAGNOSTIC_CHANNELS)[number];

type DiagnosticMeta = Record<string, unknown>;

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

function getRuntime(): "server" | "client" {
  return typeof window === "undefined" ? "server" : "client";
}

function shouldTrace(channel: DiagnosticChannel, scope: string): boolean {
  if (!enabledChannels.has(channel)) return false;
  if (scopeFilter.size === 0) return true;

  const normalizedScope = scope.toLowerCase();
  return (
    scopeFilter.has(normalizedScope) ||
    scopeFilter.has(`${channel}:${normalizedScope}`)
  );
}

export interface Diagnostics {
  enabled(channel: DiagnosticChannel): boolean;
  trace(channel: DiagnosticChannel, event: string, meta?: DiagnosticMeta): void;
  traceAsync<T>(
    channel: DiagnosticChannel,
    event: string,
    run: () => Promise<T>,
    meta?: DiagnosticMeta,
  ): Promise<T>;
}

export function createDiagnostics(
  scope: string,
  baseMeta: DiagnosticMeta = {},
): Diagnostics {
  const logger = createLogger(`diagnostic:${scope}`);

  function enabled(channel: DiagnosticChannel): boolean {
    return shouldTrace(channel, scope);
  }

  function trace(
    channel: DiagnosticChannel,
    event: string,
    meta: DiagnosticMeta = {},
  ) {
    if (!enabled(channel)) return;

    logger.info(
      event,
      normalizeMeta({
        diagnostic: true,
        channel,
        scope,
        runtime: getRuntime(),
        ...baseMeta,
        ...meta,
      }),
    );
  }

  async function traceAsync<T>(
    channel: DiagnosticChannel,
    event: string,
    run: () => Promise<T>,
    meta: DiagnosticMeta = {},
  ): Promise<T> {
    if (!enabled(channel)) {
      return run();
    }

    const startedAt = Date.now();
    trace(channel, `${event}_start`, meta);

    try {
      const result = await run();
      trace(channel, `${event}_complete`, {
        ...meta,
        durationMs: Date.now() - startedAt,
      });
      return result;
    } catch (error) {
      trace(channel, `${event}_error`, {
        ...meta,
        durationMs: Date.now() - startedAt,
        error,
      });
      throw error;
    }
  }

  return {
    enabled,
    trace,
    traceAsync,
  };
}

export function isHydrationMismatchError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  return error.message.toLowerCase().includes("hydration mismatch");
}
