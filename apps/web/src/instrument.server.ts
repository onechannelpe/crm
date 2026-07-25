import { init } from "@sentry/bun";

import {
  sentryConfig,
  validateServerConfig,
} from "./server/platform/config/env";
import { sentryDefaultDataCollection } from "./shared/observability/sentry";

validateServerConfig();

const { sentryDsn, sentryTraceSampleRate } = sentryConfig();

init({
  dsn: sentryDsn,
  tracesSampleRate: Number(sentryTraceSampleRate),
  dataCollection: sentryDefaultDataCollection(),
});
