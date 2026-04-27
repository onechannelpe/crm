import { init } from "@sentry/bun";

import { getEnvFor } from "~/lib/env";

const { sentryDsn, sentryTraceSampleRate } = getEnvFor("sentry");

init({
  dsn: sentryDsn,
  tracesSampleRate: Number(sentryTraceSampleRate),
  sendDefaultPii: false,
});
