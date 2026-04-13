import { traceHydrationEvent } from "~/lib/observability/diagnostics/client";
import { isHydrationMismatchError } from "~/lib/observability/diagnostics/core";

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "Unexpected application error";
}

export function reportBoundaryError(
  sink: { error: (message: string, meta?: Record<string, unknown>) => void },
  error: unknown,
) {
  const browserMeta =
    typeof window === "undefined"
      ? undefined
      : {
          path: window.location.pathname,
          search: window.location.search,
          hash: window.location.hash,
        };

  sink.error("ui_boundary_error", {
    boundary: "app-root",
    error,
    browser: browserMeta,
  });

  if (typeof window !== "undefined") {
    traceHydrationEvent("app-error-boundary", "boundary_error", {
      boundary: "app-root",
      browser: browserMeta,
      hydrationMismatch: isHydrationMismatchError(error),
      error,
    });
  }
}
