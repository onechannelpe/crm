import { createIntegrationRuntime } from "~/server/integrations/infrastructure/runtime";

import { infra, type ServerInfra } from "./infra";
import { memo } from "./memo";

export function createIntegrationsRuntime(infra: ServerInfra) {
  return {
    integration: createIntegrationRuntime({
      executor: infra.db,
      now: infra.now,
    }),
  };
}

export const getIntegrationsRuntime = memo(() =>
  createIntegrationsRuntime(infra),
);
