import { init } from "@sentry/bun";

import { isAppError } from "~/lib/app-errors";

init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
  sendDefaultPii: false,
  beforeSend(event, hint) {
    const err = hint.originalException;
    // Drop expected user-facing errors (validation, auth, 404, etc.) - these are not bugs
    if (isAppError(err) && err.code !== "internal") return null;
    return event;
  },
});
