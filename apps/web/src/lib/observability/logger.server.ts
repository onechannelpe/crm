import {
  createLoggerWithConfig,
  resolveLogLevel,
  type Logger,
} from "./logger-shared";

function isProductionMode(): boolean {
  return process.env.NODE_ENV === "production";
}

function useJsonOutput(): boolean {
  return process.env.LOG_FORMAT?.toLowerCase() === "json" || isProductionMode();
}

export function createLogger(
  component: string,
  baseMeta: Record<string, unknown> = {},
): Logger {
  const minimumLevel = resolveLogLevel(
    process.env.LOG_LEVEL,
    isProductionMode(),
  );
  return createLoggerWithConfig(component, baseMeta, {
    minimumLevel,
    jsonOutput: useJsonOutput(),
  });
}
