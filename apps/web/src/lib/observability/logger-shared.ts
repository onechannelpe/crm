type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

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

export function resolveLogLevel(
  raw: string | undefined,
  isProduction: boolean,
): LogLevel {
  const normalized = raw?.toLowerCase();
  if (
    normalized === "debug" ||
    normalized === "info" ||
    normalized === "warn" ||
    normalized === "error"
  ) {
    return normalized;
  }
  return isProduction ? "info" : "debug";
}

export function createLoggerWithConfig(
  component: string,
  baseMeta: Record<string, unknown>,
  config: {
    minimumLevel: LogLevel;
    jsonOutput: boolean;
  },
): Logger {
  const { minimumLevel, jsonOutput } = config;

  function log(
    level: LogLevel,
    message: string,
    meta: Record<string, unknown> = {},
  ) {
    if (LOG_LEVEL_WEIGHT[level] < LOG_LEVEL_WEIGHT[minimumLevel]) return;

    const mergedMeta = { ...baseMeta, ...meta };
    const normalizedMeta = Object.fromEntries(
      Object.entries(mergedMeta).map(([key, value]) => [
        key,
        normalizeMetaValue(value),
      ]),
    );

    const payload = {
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      ...normalizedMeta,
    };

    if (jsonOutput) {
      const output = JSON.stringify(payload);
      if (level === "error" || level === "warn") {
        console.error(output);
      } else {
        console.log(output);
      }
      return;
    }

    const rest =
      Object.keys(normalizedMeta).length > 0
        ? ` ${JSON.stringify(normalizedMeta)}`
        : "";
    const line = `[${payload.timestamp}] [${level.toUpperCase()}] [${component}] ${message}${rest}`;
    if (level === "error" || level === "warn") {
      console.error(line);
    } else {
      console.log(line);
    }
  }

  return {
    debug(message, meta) {
      log("debug", message, meta);
    },
    info(message, meta) {
      log("info", message, meta);
    },
    warn(message, meta) {
      log("warn", message, meta);
    },
    error(message, meta) {
      log("error", message, meta);
    },
  };
}
