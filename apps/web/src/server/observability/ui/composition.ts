import { createActionObservationsRepo } from "~/server/observability/repos-action-observations";
import { createAuthFunnelEventsRepo } from "~/server/observability/repos-auth-funnel-events";
import { createObservabilityService } from "~/server/observability/service";
import {
  serverInfrastructure,
  type ServerInfrastructure,
} from "~/server/platform/composition/infrastructure";

export function createObservabilityComposition(infra: ServerInfrastructure) {
  return {
    observabilityService: createObservabilityService({
      actionObservations: createActionObservationsRepo(infra.db),
      authFunnelEvents: createAuthFunnelEventsRepo(infra.db),
    }),
  };
}

export function composeObservability() {
  return createObservabilityComposition(serverInfrastructure);
}
