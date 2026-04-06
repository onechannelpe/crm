import type { AppContext } from "~/server/shared/action-runtime";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { fromDbCapacityRequestKind } from "../domain/request-policy";
import type { CapacityRequestStatus } from "../domain/types";
import type { CapacityReadContext } from "../infrastructure/read-context";

export type PendingCapacityRequest = {
  id: number;
  userId: number;
  kind: "search_extra" | "lead_refill";
  status: CapacityRequestStatus;
  requestedAmount: number;
  reason: string;
  decisionNote: string | null;
  reviewerUserId: number | null;
  createdAt: number;
  updatedAt: number;
  decidedAt: number | null;
  names: string;
  firstSurname: string;
  secondSurname: string;
  teamId: number | null;
  branchId: number;
};

export async function listPendingRequests(
  ctx: AppContext,
  deps: CapacityReadContext,
): Promise<Result<PendingCapacityRequest[], DomainError>> {
  try {
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
    if (ctx.actor.role !== "supervisor") return Ok(scopedPending);

    const supervisedTeam = await deps.repos.teams.findBySupervisorId(
      ctx.actor.userId,
    );
    if (!supervisedTeam) return Ok([]);

    return Ok(
      scopedPending.filter((request) => request.teamId === supervisedTeam.id),
    );
  } catch (error) {
    return Err(
      domainError(
        "unexpected",
        "unexpected",
        error instanceof Error
          ? error.message
          : "Failed to list pending requests",
      ),
    );
  }
}
