import { longName } from "~/lib/users/display-name";
import {
  getLeadCapacitySnapshot,
  type LeadCapacitySnapshot,
} from "~/server/capacity/application/get-lead-capacity-snapshot";
import {
  getSearchCapacitySnapshot,
  type SearchCapacitySnapshot,
} from "~/server/capacity/application/get-search-capacity-snapshot";
import type { AppContext } from "~/server/shared/action-runtime";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { canManageExecutive } from "../domain/access-policy";
import { fromDbCapacityRequestKind } from "../domain/request-policy";
import type { CapacityRequestStatus } from "../domain/types";
import type { CapacityReadContext } from "../infrastructure/read-context";

export type ExecutiveCapacityDetail = {
  executive: {
    id: number;
    fullName: string;
    email: string;
    teamId: number | null;
  };
  searchStatus: SearchCapacitySnapshot;
  leadStatus: LeadCapacitySnapshot;
  requests: Array<{
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
  }>;
};

export async function getExecutiveDetail(
  ctx: AppContext,
  deps: CapacityReadContext,
  input: { userId: number },
): Promise<Result<ExecutiveCapacityDetail, DomainError>> {
  try {
    const managed = await canManageExecutive(
      ctx.actor,
      input.userId,
      deps.repos,
    );
    if (!managed.target) {
      return Err(
        domainError("not_found", "executive_not_found", "Executive not found"),
      );
    }
    if (!managed.ok) {
      return Err(domainError("forbidden", "forbidden", "Forbidden"));
    }

    const [searchStatus, leadStatus, requests] = await Promise.all([
      getSearchCapacitySnapshot(input.userId, deps.repos),
      getLeadCapacitySnapshot(input.userId, deps.repos),
      deps.repos.capacityRequests.listByUser(input.userId),
    ]);

    if (isErr(searchStatus)) return searchStatus;
    if (isErr(leadStatus)) return leadStatus;

    return Ok({
      executive: {
        id: input.userId,
        fullName: longName(managed.target),
        email: managed.target.email,
        teamId: managed.target.team_id,
      },
      searchStatus: searchStatus.value,
      leadStatus: leadStatus.value,
      requests: requests.map((request) => ({
        ...request,
        kind: fromDbCapacityRequestKind(request.kind),
      })),
    });
  } catch (error) {
    return Err(
      domainError(
        "unexpected",
        "unexpected",
        error instanceof Error
          ? error.message
          : "Failed to get executive capacity detail",
      ),
    );
  }
}
