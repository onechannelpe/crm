import type { JSX } from "solid-js";
import { ErrorBoundary as SolidErrorBoundary } from "solid-js";

import { createLogger } from "~/lib/observability/logger";

import { getErrorMessage, reportBoundaryError } from "./boundary-utils";
import { ErrorState } from "./state";

interface AppErrorBoundaryProps {
  children: JSX.Element;
  title?: string;
}

const logger = createLogger("app-error-boundary");

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
