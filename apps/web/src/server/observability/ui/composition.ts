import { createActionObservationsRepo } from "~/server/observability/repos-action-observations";
import { createAuthFunnelEventsRepo } from "~/server/observability/repos-auth-funnel-events";
import { createObservabilityService } from "~/server/observability/service";
import {
  serverInfrastructure as defaultServerInfrastructure,
  type ServerInfrastructure,
} from "~/server/platform/composition/infrastructure";

export function createObservabilityComposition(
  serverInfrastructure: ServerInfrastructure,
) {
  return {
    observabilityService: createObservabilityService({
      actionObservations: createActionObservationsRepo(serverInfrastructure.db),
      authFunnelEvents: createAuthFunnelEventsRepo(serverInfrastructure.db),
    }),
  };
}

export function composeObservability() {
  return createObservabilityComposition(defaultServerInfrastructure);
}
