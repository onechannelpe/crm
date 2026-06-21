import { createLogger } from "../logger";
import { readRuntimeEnv } from "../runtime-env";

const DIAGNOSTIC_CHANNELS = ["ssr", "hydration"] as const;

export type DiagnosticChannel = (typeof DIAGNOSTIC_CHANNELS)[number];
export type DiagnosticMeta = Record<string, unknown>;

const loggerByScope = new Map<string, ReturnType<typeof createLogger>>();

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

function getDiagnosticRuntime(): "server" | "client" {
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
