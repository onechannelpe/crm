import { init } from "@sentry/bun";

import { serverEnv } from "~/lib/env";

const { sentryDsn, sentryTraceSampleRate } = serverEnv().sentry;

init({
  dsn: sentryDsn,
  tracesSampleRate: Number(sentryTraceSampleRate),
  sendDefaultPii: false,
});
