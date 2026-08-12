import { makeAppContext, makeAuthSession } from "@tests/support/unit/factories";

import type { CapacityRequestId, UserId } from "~/domain/ids";
import type {
  CapacityGrantTx,
  CapacityManageTx,
  CapacityRequestTx,
} from "~/server/capacity/application/use-cases/shared";
import type { CapacityApprovalDeps } from "~/server/capacity/application/use-cases/shared";
import { createCapacityRequestsRepo } from "~/server/capacity/infrastructure/capacity-requests-repo";
import { createCapacityUsersRepo } from "~/server/capacity/infrastructure/capacity-users-repo";
import {
  createLeadCapacityGrantsRepo,
  createSearchCapacityGrantsRepo,
} from "~/server/capacity/infrastructure/usage-repo";
import type { AppContext } from "~/server/platform/action/context";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import { createExecutorUow } from "~/server/platform/database/uow";
import { createActionRateLimiter } from "~/server/security/action-rate-limit";

import { TEST_FIXTURES, type TestDbContext } from "../runtime/db";

const SEEDED_APPROVAL_USERS = {
  superuserBranchTwo: {
    id: TEST_FIXTURES.users.superUser.id,
    branchId: TEST_FIXTURES.branches.norte.id,
  },
  executiveBranchOne: {
    id: TEST_FIXTURES.users.execOne.id,
    branchId: TEST_FIXTURES.branches.lima.id,
  },
  executiveBranchTwo: {
    id: TEST_FIXTURES.users.execTwo.id,
    branchId: TEST_FIXTURES.branches.norte.id,
  },
} as const;

export const SUPERUSER_ID = SEEDED_APPROVAL_USERS.superuserBranchTwo.id;
export const EXECUTIVE_ID = SEEDED_APPROVAL_USERS.executiveBranchOne.id;
export const EXECUTIVE_OTHER_BRANCH_ID =
  SEEDED_APPROVAL_USERS.executiveBranchTwo.id;

type ApprovalTx = CapacityRequestTx & CapacityManageTx & CapacityGrantTx;

type GrantRow = {
  userId: UserId;
  amount: number;
  reason: string;
  actorUserId: UserId;
};

export function makeApprovalContext(
  overrides: Partial<
    Pick<AppContext["actor"], "userId" | "role" | "branchId">
  > = {},
): AppContext {
  return makeAppContext({
    actor: makeAuthSession({
      id: "test-session",
      userId: overrides.userId ?? SUPERUSER_ID,
      role: overrides.role ?? "superuser",
      branchId:
        overrides.branchId ?? SEEDED_APPROVAL_USERS.superuserBranchTwo.branchId,
    }),
    requestId: "req-test",
    traceId: "trace-test",
    userAgent: null,
  });
}

export function makeApprovalDeps(
  ctx: TestDbContext,
  options: { failGrantInsert?: boolean } = {},
): CapacityApprovalDeps {
  return {
    rateLimiter: createActionRateLimiter(ctx.db),
    uow: createExecutorUow<ApprovalTx>(ctx.db, (txDb): ApprovalTx => {
      const repos = bindApprovalRepos(txDb);
      if (!options.failGrantInsert) {
        return repos;
      }
      // Fail the grant insert after markApproved to exercise transaction rollback.
      return {
        ...repos,
        searchCapacityGrants: {
          ...repos.searchCapacityGrants,
          insert: () => Promise.reject(new Error("db connection lost")),
        },
      };
    }),
  };
}

function bindApprovalRepos(txDb: DatabaseExecutor): ApprovalTx {
  return {
    users: createCapacityUsersRepo(txDb),
    capacityRequests: createCapacityRequestsRepo(txDb),
    searchCapacityGrants: createSearchCapacityGrantsRepo(txDb),
    leadCapacityGrants: createLeadCapacityGrantsRepo(txDb),
  };
}

export async function seedRequest(
  ctx: TestDbContext,
  values: {
    userId: UserId;
    kind: "search_extra" | "lead_refill_extra";
    status: "pending" | "approved" | "rejected" | "canceled";
    requestedAmount: number;
    reason: string;
  },
): Promise<CapacityRequestId> {
  const now = new Date();
  const row = await ctx.db
    .insertInto("capacity_requests")
    .values({
      user_id: values.userId,
      kind: values.kind,
      status: values.status,
      requested_amount: values.requestedAmount,
      reason: values.reason,
      decision_note: null,
      reviewer_user_id: null,
      created_at: now,
      updated_at: now,
      decided_at: null,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  return row.id;
}

export function searchGrantsFor(
  ctx: TestDbContext,
  userId: UserId,
): Promise<GrantRow[]> {
  return readGrants(ctx, "search_capacity_grants", userId);
}

export function leadGrantsFor(
  ctx: TestDbContext,
  userId: UserId,
): Promise<GrantRow[]> {
  return readGrants(ctx, "lead_capacity_grants", userId);
}

async function readGrants(
  ctx: TestDbContext,
  table: "search_capacity_grants" | "lead_capacity_grants",
  userId: UserId,
): Promise<GrantRow[]> {
  const rows = await ctx.db
    .selectFrom(table)
    .select(["user_id", "amount", "reason", "actor_user_id"])
    .where("user_id", "=", userId)
    .orderBy("created_at", "asc")
    .execute();
  return rows.map((row) => ({
    userId: row.user_id,
    amount: row.amount,
    reason: row.reason,
    actorUserId: row.actor_user_id,
  }));
}
