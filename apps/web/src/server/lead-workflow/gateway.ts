import { engineClient } from "~/server/shared/engine";
import type { EngineClient } from "~/server/shared/engine/client";
import type { LeadCandidate } from "~/server/shared/engine/types";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import type { BranchId, UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

export type { LeadCandidate };

export interface RequestCandidatesRequest {
  userId: UserId;
  branchId: BranchId;
  amount: number;
}

export async function requestCandidates(
  request: RequestCandidatesRequest,
  engine: EngineClient = engineClient,
): Promise<Result<LeadCandidate[], DomainError>> {
  try {
    const response = await engine.leadCandidates({
      userId: request.userId,
      branchId: request.branchId,
      amount: request.amount,
    });
    return Ok(response.candidates);
  } catch (error) {
    return Err(
      domainError(
        "external",
        "engine_request_failed",
        error instanceof Error ? error.message : "Lead candidate request failed",
      ),
    );
  }
}
