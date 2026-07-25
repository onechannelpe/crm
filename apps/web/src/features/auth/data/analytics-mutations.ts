import { action } from "@solidjs/router";

import { trackAuthClientEvent } from "~/actions/auth/analytics";
import type { AuthFunnelClientEventPayload } from "~/domain/observability/auth-funnel";

export const trackAuthClientEventMutation = action(
  async (event: AuthFunnelClientEventPayload): Promise<void> =>
    trackAuthClientEvent(event),
  "trackAuthClientEvent",
);
