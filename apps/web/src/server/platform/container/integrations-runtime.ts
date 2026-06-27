import { createIntegrationRuntime } from "~/server/integrations/infrastructure/runtime";

import type { ServerInfra } from "./infra";

export function createIntegrationsRuntime(infra: ServerInfra) {
  return {
    integration: createIntegrationRuntime({
      executor: infra.db,
      now: infra.now,
    }),
  };
}
