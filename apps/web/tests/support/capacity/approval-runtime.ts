import {
  createLeadCapacityGrantsRepo,
  createSearchCapacityGrantsRepo,
} from "~/server/capacity-usage/repos";
import type {
  CapacityGrantTx,
  CapacityManageTx,
  CapacityRequestTx,
} from "~/server/capacity/application/use-cases/shared";
import type { CapacityApprovalDeps } from "~/server/capacity/application/use-cases/shared";
import { createCapacityRequestsRepo } from "~/server/capacity/infrastructure/capacity-requests-repo";
import { createCapacityUsersRepo } from "~/server/capacity/infrastructure/capacity-users-repo";
import type { AppContext } from "~/server/shared/action-runtime";
import { createExecutorUow } from "~/server/shared/application/uow";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import type { TestDbContext } from "../runtime/db";

// Seeded users from the template DB (tests/support/runtime/db.ts).
export const SUPERUSER_ID = 5; // superuser, branch 2 (can manage any executive)
export const EXECUTIVE_ID = 1; // executive, branch 1
export const EXECUTIVE_OTHER_BRANCH_ID = 3; // executive, branch 2

type ApprovalTx = CapacityRequestTx & CapacityManageTx & CapacityGrantTx;

type GrantRow = {
  userId: number;
  amount: number;
  reason: string;
  actorUserId: number;
};

export function makeApprovalContext(
  overrides: Partial<
    Pick<AppContext["actor"], "userId" | "role" | "branchId">
  > = {},
): AppContext {
  return {
    actor: {
      id: "test-session",
      userId: overrides.userId ?? SUPERUSER_ID,
      role: overrides.role ?? "superuser",
      branchId: overrides.branchId ?? 2,
      onboardingCompleted: true,
      sessionClass: "app",
      primaryAuthMethod: "password",
      strongAuthMethod: null,
      strongAuthAt: null,
    },
    requestId: "req-test",
    traceId: "trace-test",
    ipAddress: "127.0.0.1",
    userAgent: null,
    publicOrigin: "http://localhost:3000",
    now: () => 1_700_000_000_000,
  };
}

export function makeApprovalDeps(
  ctx: TestDbContext,
  options: { failGrantInsert?: boolean } = {},
): CapacityApprovalDeps {
  return {
    rateLimitDeps: {
      actionRateLimits: ctx.repos.actionRateLimits,
      auditLogs: ctx.repos.auditLogs,
    },
    uow: createExecutorUow<ApprovalTx>(ctx.db, (txDb): ApprovalTx => {
      const repos = bindApprovalRepos(txDb);
      if (!options.failGrantInsert) {
        return repos;
      }
      // Force the grant insert to fail after markApproved has already written,
      // so the test observes the real transaction rolling back.
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
    userId: number;
    kind: "search_extra" | "lead_refill_extra";
    status: "pending" | "approved" | "rejected" | "canceled";
    requestedAmount: number;
    reason: string;
  },
): Promise<number> {
  const now = Date.now();
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
  userId: number,
): Promise<GrantRow[]> {
  return readGrants(ctx, "search_capacity_grants", userId);
}

export function leadGrantsFor(
  ctx: TestDbContext,
  userId: number,
): Promise<GrantRow[]> {
  return readGrants(ctx, "lead_capacity_grants", userId);
}

async function readGrants(
  ctx: TestDbContext,
  table: "search_capacity_grants" | "lead_capacity_grants",
  userId: number,
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
