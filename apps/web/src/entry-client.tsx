// @refresh reload
import { init, replayIntegration } from "@sentry/solid";
import { solidRouterBrowserTracingIntegration } from "@sentry/solid/solidrouter";
import { mount, StartClient } from "@solidjs/start/client";

import {
  isHydrationDiagnosticsEnabled,
  traceHydrationEvent,
} from "./lib/observability/diagnostics/client";
import { isHydrationMismatchError } from "./lib/observability/diagnostics/core";
import { setupCsrfInterceptor } from "./lib/security/csrf-client";

init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [solidRouterBrowserTracingIntegration(), replayIntegration()],
  tracesSampleRate: Number(
    import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? "0.1",
  ),
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,
  sendDefaultPii: false,
});

setupCsrfInterceptor();

const HYDRATION_SCOPE = "entry-client";

const app = document.getElementById("app");
if (!app) {
  throw new Error("Missing #app root element");
}

if (isHydrationDiagnosticsEnabled(HYDRATION_SCOPE)) {
  traceHydrationEvent(HYDRATION_SCOPE, "mount_start", {
    path: window.location.pathname,
    search: window.location.search,
  });

  window.addEventListener("error", (event) => {
    traceHydrationEvent(HYDRATION_SCOPE, "window_error", {
      message: event.message,
      hydrationMismatch:
        event.error instanceof Error && isHydrationMismatchError(event.error),
      error: event.error,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    traceHydrationEvent(HYDRATION_SCOPE, "unhandled_rejection", {
      hydrationMismatch: isHydrationMismatchError(event.reason),
      reason: event.reason,
    });
  });
}

mount(() => <StartClient />, app);

queueMicrotask(() => {
  traceHydrationEvent(HYDRATION_SCOPE, "mount_complete", {
    path: window.location.pathname,
    search: window.location.search,
  });
});
