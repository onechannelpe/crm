import type { EngineClient } from "~/server/shared/engine/client";

import type { WorkflowEngineGateway } from "./engine-port";

export function createEngineGateway(
  engine: EngineClient,
): WorkflowEngineGateway {
  return {
    async enrichByRuc(ruc: string) {
      const result = await engine.search("companies", ruc, 1);
      if (!result.ok) {
        return null;
      }

      const match =
        result.value.find(
          (candidate) =>
            candidate.kind === "company" && candidate.company.ruc === ruc,
        ) ??
        result.value[0] ??
        null;

      return match && match.kind === "company"
        ? {
            legalName: match.company.legal_name ?? null,
            address: match.company.fiscal_address ?? null,
          }
        : null;
    },
  };
}
