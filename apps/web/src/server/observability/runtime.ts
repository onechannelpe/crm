import { db } from "~/lib/db/db";

import { createActionObservationsRepo } from "./repos-action-observations";
import { createAuthFunnelEventsRepo } from "./repos-auth-funnel-events";
import { createObservabilityService } from "./service";

const observabilityService = createObservabilityService({
  actionObservations: createActionObservationsRepo(db),
  authFunnelEvents: createAuthFunnelEventsRepo(db),
});

export function getObservabilityRuntime() {
  return { observabilityService };
}
