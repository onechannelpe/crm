import {
  isDiagnosticEnabled,
  traceDiagnostic,
  type DiagnosticMeta,
} from "./core";

export function isHydrationDiagnosticsEnabled(scope: string): boolean {
  return import.meta.env.DEV && isDiagnosticEnabled("hydration", scope);
}

export function traceHydrationEvent(
  scope: string,
  event: string,
  meta: DiagnosticMeta = {},
) {
  if (!import.meta.env.DEV) {
    return;
  }
  traceDiagnostic(scope, "hydration", event, meta);
}

export function isHydrationMismatchError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.toLowerCase().includes("hydration mismatch");
}
