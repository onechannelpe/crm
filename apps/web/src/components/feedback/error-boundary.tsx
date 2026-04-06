import type { JSX } from "solid-js";
import { ErrorBoundary as SolidErrorBoundary } from "solid-js";

import { traceHydrationEvent } from "~/lib/observability/diagnostics/client";
import { isHydrationMismatchError } from "~/lib/observability/diagnostics/core";
import { createLogger } from "~/lib/observability/logger";

import { ErrorState } from "./error-state";

interface AppErrorBoundaryProps {
  children: JSX.Element;
  title?: string;
}

const logger = createLogger("app-error-boundary");

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

export function AppErrorBoundary(props: AppErrorBoundaryProps) {
  return (
    <SolidErrorBoundary
      fallback={(error, reset) => {
        reportBoundaryError(logger, error);
        return (
          <ErrorState
            title={props.title}
            message={getErrorMessage(error)}
            onRetry={reset}
          />
        );
      }}
    >
      {props.children}
    </SolidErrorBoundary>
  );
}
