import { createActionObservationsRepo } from "~/server/observability/repos-action-observations";
import { createAuthFunnelEventsRepo } from "~/server/observability/repos-auth-funnel-events";
import { createObservabilityService } from "~/server/observability/service";

import { infra, type ServerInfra } from "./infra";
import { memo } from "./memo";

export function createObservabilityRuntime(infra: ServerInfra) {
  return {
    observabilityService: createObservabilityService({
      actionObservations: createActionObservationsRepo(infra.db),
      authFunnelEvents: createAuthFunnelEventsRepo(infra.db),
    }),
  };
}

export const getObservabilityRuntime = memo(() =>
  createObservabilityRuntime(infra),
);
