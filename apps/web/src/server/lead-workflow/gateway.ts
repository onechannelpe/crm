import { engineClient } from "~/server/shared/composition-root";
import type { DomainError } from "~/server/shared/domain-error";
import type { LeadCandidate } from "~/server/shared/engine/types";
import type { BranchId, UserId } from "~/server/shared/ids";
import type { Result } from "~/server/shared/result";
import { Ok, isErr } from "~/server/shared/result";

export interface RequestCandidatesRequest {
  userId: UserId;
  branchId: BranchId;
  amount: number;
}

export async function requestCandidates(
  request: RequestCandidatesRequest,
  engine: {
    requestCandidates: typeof engineClient.requestCandidates;
  } = engineClient,
): Promise<Result<LeadCandidate[], DomainError>> {
  const result = await engine.requestCandidates({
    branchId: request.branchId,
    userId: request.userId,
    amount: request.amount,
  });

  if (isErr(result)) {
    return result;
  }

  return Ok(result.value);
}
