import "server-only";
import { createIntegrationRuntime } from "~/server/integrations/infrastructure/runtime";
import {
  serverInfrastructure as defaultServerInfrastructure,
  type ServerInfrastructure,
} from "~/server/platform/composition/infrastructure";

function createIntegrationsComposition(
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
  return createIntegrationsComposition(defaultServerInfrastructure);
}
