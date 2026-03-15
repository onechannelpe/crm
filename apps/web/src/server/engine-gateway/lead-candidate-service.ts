import { engineClient } from "~/server/shared/engine";
import type { EngineClient } from "~/server/shared/engine/client";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { LeadCandidate } from "./types";

export type LeadCandidateError =
  | { reason: "engine_unavailable"; message: string }
  | { reason: "unexpected"; message: string };

export function createLeadCandidateService(
  engine: EngineClient = engineClient,
) {
  return {
    async requestCandidatesForExecutive(input: {
      userId: number;
      branchId: number;
      amount: number;
    }): Promise<Result<LeadCandidate[], LeadCandidateError>> {
      try {
        const healthy = await engine.health();
        if (!healthy) {
          return Err({
            reason: "engine_unavailable",
            message:
              "Lead engine unavailable. Verify engine service and dataset.",
          });
        }
        const response = await engine.leadCandidates(input);
        return Ok(response.candidates);
      } catch {
        return Err({
          reason: "unexpected",
          message: "Failed to request lead candidates",
        });
      }
    },
  };
}
