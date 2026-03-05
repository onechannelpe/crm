import {
  createLoggerWithConfig,
  resolveLogLevel,
  type Logger,
} from "./logger-shared";

function readClientEnv(key: string): string | undefined {
  const value = (import.meta.env as Record<string, unknown>)[`VITE_${key}`];
  return typeof value === "string" ? value : undefined;
}

function isProductionMode(): boolean {
  return import.meta.env.PROD || import.meta.env.MODE === "production";
}

function useJsonOutput(): boolean {
  return (
    readClientEnv("LOG_FORMAT")?.toLowerCase() === "json" || isProductionMode()
  );
}

export function createLogger(
  component: string,
  baseMeta: Record<string, unknown> = {},
): Logger {
  const minimumLevel = resolveLogLevel(
    readClientEnv("LOG_LEVEL"),
    isProductionMode(),
  );
  return createLoggerWithConfig(component, baseMeta, {
    minimumLevel,
    jsonOutput: useJsonOutput(),
  });
}
