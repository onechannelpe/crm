import { init } from "@sentry/bun";

import { sentryConfig, validateServerConfig } from "~/lib/env";
import { sentryDefaultDataCollection } from "~/lib/observability/sentry";

validateServerConfig();

const { sentryDsn, sentryTraceSampleRate } = sentryConfig();

init({
  dsn: sentryDsn,
  tracesSampleRate: Number(sentryTraceSampleRate),
  dataCollection: sentryDefaultDataCollection(),
});
