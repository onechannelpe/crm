import { longName } from "~/lib/users/display-name";
import { getLeadCapacitySnapshot } from "~/server/capacity/application/queries/get-lead-capacity-snapshot";
import { getSearchCapacitySnapshot } from "~/server/capacity/application/queries/get-search-capacity-snapshot";
import type { AppContext } from "~/server/shared/action-runtime/context";
import {
  fail,
  forbidden,
  type DomainError,
} from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { canManageExecutive } from "../../domain/access-policy";
import { fromDbCapacityRequestKind } from "../../domain/request-policy";
import type { CapacityUser } from "../actor-scope";
import type { ExecutiveCapacityDetailView } from "../contracts";

interface ExecutiveDetailDeps {
  repos: {
    users: { findById(id: number): Promise<CapacityUser | undefined> };
    capacityRequests: {
      listByUser(userId: number): Promise<
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
        }>
      >;
    };
  } & Omit<Parameters<typeof getSearchCapacitySnapshot>[1], "users"> &
    Omit<Parameters<typeof getLeadCapacitySnapshot>[1], "users">;
}

export async function getExecutiveDetail(
  ctx: AppContext,
  deps: ExecutiveDetailDeps,
  input: { userId: number },
): Promise<Result<ExecutiveCapacityDetailView, DomainError>> {
  const managed = await canManageExecutive(ctx.actor, input.userId, deps.repos);
  if (!managed.target) {
    return Err(
      fail("executive_not_found"),
    );
  }
  if (!managed.ok) {
    return Err(forbidden());
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
      teamId: managed.target.teamId,
      executiveCategory: managed.target.executiveCategory,
    },
    searchStatus: searchStatus.value,
    leadStatus: leadStatus.value,
    requests: requests.map((request) => ({
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
    })),
  });
}
