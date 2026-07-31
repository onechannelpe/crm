import { action } from "@solidjs/router";

import type { AuthFunnelClientEventPayload } from "~/domain/observability/auth-funnel";
import { trackAuthClientEvent } from "~/rpc/auth/analytics.action";

export const trackAuthClientEventMutation = action(
  async (event: AuthFunnelClientEventPayload): Promise<void> =>
    trackAuthClientEvent(event),
  "trackAuthClientEvent",
);
