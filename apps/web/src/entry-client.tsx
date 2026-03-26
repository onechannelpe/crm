// @refresh reload
import { mount, StartClient } from "@solidjs/start/client";

import {
  createDiagnostics,
  isHydrationMismatchError,
} from "./lib/observability/diagnostics";
import { setupCsrfInterceptor } from "./lib/security/csrf-client";

setupCsrfInterceptor();

const diagnostics = createDiagnostics("entry-client");

const app = document.getElementById("app");
if (!app) {
  throw new Error("Missing #app root element");
}

if (diagnostics.enabled("hydration")) {
  diagnostics.trace("hydration", "mount_start", {
    path: window.location.pathname,
    search: window.location.search,
  });

  window.addEventListener("error", (event) => {
    diagnostics.trace("hydration", "window_error", {
      message: event.message,
      hydrationMismatch:
        event.error instanceof Error && isHydrationMismatchError(event.error),
      error: event.error,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    diagnostics.trace("hydration", "unhandled_rejection", {
      hydrationMismatch: isHydrationMismatchError(event.reason),
      reason: event.reason,
    });
  });
}

mount(() => <StartClient />, app);

queueMicrotask(() => {
  diagnostics.trace("hydration", "mount_complete", {
    path: window.location.pathname,
    search: window.location.search,
  });
});
