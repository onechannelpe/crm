import { action } from "@solidjs/router";

import { trackAuthClientEvent } from "~/actions/auth/analytics";
import type { AuthClientAnalyticsEvent } from "~/lib/auth/auth-analytics";

export const trackAuthClientEventMutation = action(
  async (event: AuthClientAnalyticsEvent): Promise<void> =>
    trackAuthClientEvent(event),
  "trackAuthClientEvent",
);
