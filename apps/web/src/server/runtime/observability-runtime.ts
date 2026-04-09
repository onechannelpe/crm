import { createActionObservationsRepo } from "~/server/observability/repos-action-observations";
import { createAuthFunnelEventsRepo } from "~/server/observability/repos-auth-funnel-events";
import { createObservabilityService } from "~/server/observability/service";

import type { ServerInfra } from "./infra";
import { createServerInfra } from "./infra";

export function createObservabilityRuntime(infra: ServerInfra) {
  return {
    observabilityService: createObservabilityService({
      actionObservations: createActionObservationsRepo(infra.db),
      authFunnelEvents: createAuthFunnelEventsRepo(infra.db),
    }),
  };
}

export const observabilityRuntime =
  createObservabilityRuntime(createServerInfra());
