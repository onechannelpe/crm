import { domainError, type DomainError } from "~/server/shared/domain-error";
import { engineClient } from "~/server/shared/engine";
import type { EngineClient } from "~/server/shared/engine/client";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { LeadCandidate, LeadCandidateRequestInput } from "./types";

export function createLeadCandidateService(
  engine: EngineClient = engineClient,
) {
  return {
    async requestCandidatesForExecutive(
      input: LeadCandidateRequestInput,
    ): Promise<Result<LeadCandidate[], DomainError>> {
      try {
        const response = await engine.leadCandidates(input);
        return Ok(response.candidates);
      } catch (error: unknown) {
        if (error instanceof Error) {
          return Err(
            domainError(
              "external",
              "engine_unavailable",
              error.message ||
                "Lead engine unavailable. Verify engine service and dataset.",
            ),
          );
        }
        return Err(
          domainError(
            "unexpected",
            "unexpected",
            "Failed to request lead candidates",
          ),
        );
      }
    },
  };
}
