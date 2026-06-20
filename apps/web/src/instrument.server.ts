import { init } from "@sentry/bun";

import { sentryConfig, validateServerConfig } from "~/lib/env";

validateServerConfig();

const { sentryDsn, sentryTraceSampleRate } = sentryConfig();

init({
  dsn: sentryDsn,
  tracesSampleRate: Number(sentryTraceSampleRate),
  sendDefaultPii: false,
});
