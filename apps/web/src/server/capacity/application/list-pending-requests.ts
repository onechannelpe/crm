import type { AppContext } from "~/server/shared/action-runtime";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { fromDbCapacityRequestKind } from "../domain/request-policy";
import type { CapacityRequestStatus } from "../domain/types";
import type { CapacityReadContext } from "../infrastructure/read-context";

export type PendingCapacityRequest = {
  id: number;
  user_id: number;
  kind: "search_extra" | "lead_refill";
  status: CapacityRequestStatus;
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
      ...request,
      kind: fromDbCapacityRequestKind(request.kind),
    }));
    if (ctx.actor.role !== "supervisor") return Ok(scopedPending);

    const supervisedTeam = await deps.repos.teams.findBySupervisorId(
      ctx.actor.userId,
    );
    if (!supervisedTeam) return Ok([]);

    return Ok(
      scopedPending.filter((request) => request.team_id === supervisedTeam.id),
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
