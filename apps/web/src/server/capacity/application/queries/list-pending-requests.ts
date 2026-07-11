import type { PendingCapacityRequestView } from "~/contracts/capacity";
import type { CapacityRequestsRepo } from "~/server/capacity/infrastructure/capacity-requests-repo";
import type { AppContext } from "~/server/platform/action/context";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import { epochMilliseconds } from "~/server/shared/time";

import { fromDbCapacityRequestKind } from "../../domain/request-policy";

interface PendingRequestsDeps {
  repos: {
    capacityRequests: Pick<CapacityRequestsRepo, "listPendingByBranch">;
  };
}

export async function listPendingRequests(
  ctx: AppContext,
  deps: PendingRequestsDeps,
): Promise<Result<PendingCapacityRequestView[], DomainError>> {
  const pending = await deps.repos.capacityRequests.listPendingByBranch(
    ctx.actor.branchId,
  );
  const scopedPending = pending.map((request) => ({
    id: request.id,
    userId: request.user_id,
    kind: fromDbCapacityRequestKind(request.kind),
    status: request.status,
    requestedAmount: request.requested_amount,
    reason: request.reason,
    decisionNote: request.decision_note,
    reviewerUserId: request.reviewer_user_id,
    createdAt: epochMilliseconds(request.created_at),
    updatedAt: epochMilliseconds(request.updated_at),
    decidedAt: request.decided_at
      ? epochMilliseconds(request.decided_at)
      : null,
    names: request.names,
    firstSurname: request.first_surname,
    secondSurname: request.second_surname,
    teamId: request.team_id,
    branchId: request.branch_id,
  }));
  return Ok(scopedPending);
}
