import { init } from "@sentry/bun";

import {
  sentryConfig,
  validateServerConfig,
} from "./server/platform/config/env";
import { isProduction } from "./shared/observability/runtime-env";
import { sentryDefaultDataCollection } from "./shared/observability/sentry";

validateServerConfig();

if (isProduction()) {
  const { sentryDsn, sentryTraceSampleRate } = sentryConfig();

  init({
    dsn: sentryDsn,
    tracesSampleRate: Number(sentryTraceSampleRate),
    dataCollection: sentryDefaultDataCollection(),
  });
}
