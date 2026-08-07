// @refresh reload
import { init, replayIntegration } from "@sentry/solid";
import { solidRouterBrowserTracingIntegration } from "@sentry/solid/solidrouter";
import { mount, StartClient } from "@solidjs/start/client";

import {
  isHydrationDiagnosticsEnabled,
  isHydrationMismatchError,
  traceHydrationEvent,
} from "./browser/observability/diagnostics/hydration";
import { setupBrowserRequestSecurity } from "./browser/security/csrf-client";
import { sentryDefaultDataCollection } from "./shared/observability/sentry";

if (import.meta.env.PROD) {
  init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [solidRouterBrowserTracingIntegration(), replayIntegration()],
    tracesSampleRate: Number(
      import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? "0.1",
    ),
    replaysSessionSampleRate: Number(
      import.meta.env.VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE ?? "0.05",
    ),
    replaysOnErrorSampleRate: Number(
      import.meta.env.VITE_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE ?? "1.0",
    ),
    dataCollection: sentryDefaultDataCollection(),
  });
}

setupBrowserRequestSecurity();

const HYDRATION_SCOPE = "entry-client";
const hydrationDiagnosticsEnabled =
  isHydrationDiagnosticsEnabled(HYDRATION_SCOPE);

const app = document.getElementById("app");

if (!app) {
  throw new Error("Missing #app root element");
}

if (hydrationDiagnosticsEnabled) {
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

if (hydrationDiagnosticsEnabled) {
  queueMicrotask(() => {
    traceHydrationEvent(HYDRATION_SCOPE, "mount_complete", {
      path: window.location.pathname,
      search: window.location.search,
    });
  });
}
