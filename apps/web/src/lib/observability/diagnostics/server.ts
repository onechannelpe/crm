import {
  type DiagnosticMeta,
  traceDiagnostic,
  traceDiagnosticAsync,
} from "./core";

export function traceSsrBoundary(
  scope: string,
  event: string,
  meta: DiagnosticMeta = {},
) {
  traceDiagnostic(scope, "ssr", event, meta);
}

export function traceServerAction<T>(
  scope: string,
  event: string,
  run: () => Promise<T>,
  meta: DiagnosticMeta = {},
): Promise<T> {
  return traceDiagnosticAsync(scope, "ssr", event, run, meta);
}
