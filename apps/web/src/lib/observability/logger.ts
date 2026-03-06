import {
  createLoggerWithConfig,
  resolveLogLevel,
  type Logger,
} from "./logger-shared";

function readServerEnv(key: string): string | undefined {
  if (typeof process === "undefined" || typeof process.env === "undefined") {
    return undefined;
  }
  const value = process.env[key];
  return typeof value === "string" ? value : undefined;
}

function readClientEnv(key: string): string | undefined {
  const value = (import.meta.env as Record<string, unknown>)[`VITE_${key}`];
  return typeof value === "string" ? value : undefined;
}

function readRuntimeEnv(key: string): string | undefined {
  return readServerEnv(key) ?? readClientEnv(key);
}

function isProductionMode(): boolean {
  const mode = readRuntimeEnv("NODE_ENV") ?? import.meta.env.MODE;
  return mode === "production";
}

function useJsonOutput(): boolean {
  return (
    readRuntimeEnv("LOG_FORMAT")?.toLowerCase() === "json" || isProductionMode()
  );
}

export type { Logger } from "./logger-shared";

export function createLogger(
  component: string,
  baseMeta: Record<string, unknown> = {},
): Logger {
  const minimumLevel = resolveLogLevel(
    readRuntimeEnv("LOG_LEVEL"),
    isProductionMode(),
  );
  return createLoggerWithConfig(component, baseMeta, {
    minimumLevel,
    jsonOutput: useJsonOutput(),
  });
}
