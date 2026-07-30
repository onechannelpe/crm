import { createIntegrationRuntime } from "~/server/integrations/infrastructure/runtime";
import {
  serverInfrastructure,
  type ServerInfrastructure,
} from "~/server/platform/composition/infrastructure";

export function createIntegrationsComposition(infra: ServerInfrastructure) {
  return {
    integration: createIntegrationRuntime({
      executor: infra.db,
      now: infra.now,
    }),
  };
}

export function composeIntegrations() {
  return createIntegrationsComposition(serverInfrastructure);
}
