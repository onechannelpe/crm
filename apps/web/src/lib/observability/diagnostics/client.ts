import {
  isDiagnosticEnabled,
  isHydrationMismatchError,
  traceDiagnostic,
  type DiagnosticMeta,
} from "./core";

export { isHydrationMismatchError };

export function isHydrationDiagnosticsEnabled(scope: string): boolean {
  return import.meta.env.DEV && isDiagnosticEnabled("hydration", scope);
}

export function traceHydrationEvent(
  scope: string,
  event: string,
  meta: DiagnosticMeta = {},
) {
  if (!import.meta.env.DEV) return;
  traceDiagnostic(scope, "hydration", event, meta);
}
