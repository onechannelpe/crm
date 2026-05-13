import type { AppContext } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { fromDbCapacityRequestKind } from "../domain/request-policy";
import type { PendingCapacityRequestView } from "./contracts";

interface PendingRequestsDeps {
  repos: {
    capacityRequests: {
      listPendingByBranch(branchId: number): Promise<
        Array<{
          id: number;
          user_id: number;
          kind: "search_extra" | "lead_refill_extra";
          status: "pending" | "approved" | "rejected" | "canceled";
          requested_amount: number;
          reason: string;
          decision_note: string | null;
          reviewer_user_id: number | null;
          created_at: number;
          updated_at: number;
          decided_at: number | null;
          names: string;
          first_surname: string;
          second_surname: string;
          team_id: number | null;
          branch_id: number;
        }>
      >;
    };
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
    createdAt: request.created_at,
    updatedAt: request.updated_at,
    decidedAt: request.decided_at,
    names: request.names,
    firstSurname: request.first_surname,
    secondSurname: request.second_surname,
    teamId: request.team_id,
    branchId: request.branch_id,
  }));
  return Ok(scopedPending);
}
