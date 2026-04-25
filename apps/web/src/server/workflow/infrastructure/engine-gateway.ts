import type { EngineClient } from "~/server/shared/engine/client";

import type { WorkflowEngineGateway } from "../application/ports/engine-gateway";

export function createEngineGateway(
  engine: EngineClient,
): WorkflowEngineGateway {
  return {
    async enrichByRuc(ruc: string) {
      const result = await engine.search("ruc", ruc, 1);
      if (!result.ok) {
        return null;
      }

      const match =
        result.value.find((candidate) => candidate.org?.ruc === ruc) ??
        result.value[0] ??
        null;

      return match
        ? {
            razonSocial: match.org?.name ?? null,
            address: match.org?.fiscal_address ?? null,
          }
        : null;
    },
  };
}
