import { createIntegrationRuntime } from "~/server/integrations/infrastructure/runtime";
import {
  serverInfrastructure,
  type ServerInfrastructure,
} from "~/server/platform/composition/infrastructure";

export function createIntegrationsComposition(
  serverInfrastructure: ServerInfrastructure,
) {
  return {
    integration: createIntegrationRuntime({
      executor: serverInfrastructure.db,
      now: serverInfrastructure.now,
    }),
  };
}

export function composeIntegrations() {
  return createIntegrationsComposition(serverInfrastructure);
}
