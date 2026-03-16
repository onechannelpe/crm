import { engineClient } from "~/server/shared/engine";
import type { EngineClient } from "~/server/shared/engine/client";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { LeadCandidate, LeadCandidateRequestInput } from "./types";

export type LeadCandidateError =
  | { reason: "engine_unavailable"; message: string }
  | { reason: "unexpected"; message: string };

export function createLeadCandidateService(
  engine: EngineClient = engineClient,
) {
  return {
    async requestCandidatesForExecutive(
      input: LeadCandidateRequestInput,
    ): Promise<Result<LeadCandidate[], LeadCandidateError>> {
      try {
        const response = await engine.leadCandidates(input);
        return Ok(response.candidates);
      } catch (error: unknown) {
        if (error instanceof Error) {
          return Err({
            reason: "engine_unavailable",
            message:
              error.message ||
              "Lead engine unavailable. Verify engine service and dataset.",
          });
        }
        return Err({
          reason: "unexpected",
          message: "Failed to request lead candidates",
        });
      }
    },
  };
}
