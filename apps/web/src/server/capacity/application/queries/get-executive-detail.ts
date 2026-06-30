import type { ExecutiveCapacityDetailView } from "~/contracts/capacity";
import { longName } from "~/lib/users/display-name";
import { getLeadCapacitySnapshot } from "~/server/capacity/application/queries/get-lead-capacity-snapshot";
import { getSearchCapacitySnapshot } from "~/server/capacity/application/queries/get-search-capacity-snapshot";
import type { CapacityRequestsRepo } from "~/server/capacity/infrastructure/capacity-requests-repo";
import type { AppContext } from "~/server/platform/action/context";
import {
  fail,
  forbidden,
  type DomainError,
} from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";
import { epochMilliseconds } from "~/server/shared/time";

import { canManageExecutive } from "../../domain/access-policy";
import { fromDbCapacityRequestKind } from "../../domain/request-policy";
import type { CapacityUser } from "../actor-scope";

interface ExecutiveDetailDeps {
  repos: {
    users: { findById(id: UserId): Promise<CapacityUser | undefined> };
    capacityRequests: Pick<CapacityRequestsRepo, "listByUser">;
  } & Omit<Parameters<typeof getSearchCapacitySnapshot>[1], "users"> &
    Omit<Parameters<typeof getLeadCapacitySnapshot>[1], "users">;
}

export async function getExecutiveDetail(
  ctx: AppContext,
  deps: ExecutiveDetailDeps,
  input: { userId: UserId },
): Promise<Result<ExecutiveCapacityDetailView, DomainError>> {
  const managed = await canManageExecutive(ctx.actor, input.userId, deps.repos);
  if (!managed.target) {
    return Err(fail("executive_not_found"));
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
      createdAt: epochMilliseconds(request.created_at),
      updatedAt: epochMilliseconds(request.updated_at),
      decidedAt: request.decided_at
        ? epochMilliseconds(request.decided_at)
        : null,
    })),
  });
}
