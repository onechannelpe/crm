import {
  createLoggerWithConfig,
  resolveLogLevel,
  type Logger,
} from "./logger-shared";
import { isProduction, readRuntimeEnv } from "./runtime-env";

function useJsonOutput(): boolean {
  return (
    readRuntimeEnv("LOG_FORMAT")?.toLowerCase() === "json" || isProduction()
  );
}

export function createLogger(
  component: string,
  baseMeta: Record<string, unknown> = {},
): Logger {
  const minimumLevel = resolveLogLevel(
    readRuntimeEnv("LOG_LEVEL"),
    isProduction(),
  );
  return createLoggerWithConfig(component, baseMeta, {
    minimumLevel,
    jsonOutput: useJsonOutput(),
  });
}
