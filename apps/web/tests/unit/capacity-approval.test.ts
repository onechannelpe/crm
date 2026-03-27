import { describe, expect, it } from "vitest";

import type { Role } from "~/lib/auth/access/rbac";
import {
  approveCapacityRequest,
  rejectCapacityRequest,
  type ApproveRepos,
  type ApproveTransactionRunner,
} from "~/server/capacity-admin/approve-capacity";

import {
  makeLeadCapacityGrantsRepo,
  makeSearchCapacityGrantsRepo,
} from "../support/capacity-fakes";

const ACTOR_USER_ID = 99;
const TARGET_USER_ID = 1;
const REQUEST_ID = 42;

function makeActor(role: Role = "admin") {
  return {
    sessionId: "test",
    userId: ACTOR_USER_ID,
    role,
    branchId: 1,
    onboardingCompleted: true,
    sessionClass: "app" as const,
    primaryAuthMethod: "password" as const,
    strongAuthMethod: null,
    strongAuthAt: null,
  };
}

type RequestRow = {
  id: number;
  user_id: number;
  kind: "search_extra" | "lead_extra";
  status: "pending" | "approved" | "rejected";
  requested_amount: number;
  reason: string;
};

function makeCapacityRequestsRepo(request: RequestRow | undefined) {
  const rows: RequestRow[] = request ? [{ ...request }] : [];
  return {
    rows,
    findById: async (id: number) => rows.find((r) => r.id === id),
    markApproved: async (id: number) => {
      const row = rows.find((r) => r.id === id);
      if (row) row.status = "approved";
      return { numUpdatedRows: row ? BigInt(1) : BigInt(0) };
    },
    markRejected: async (id: number) => {
      const row = rows.find((r) => r.id === id);
      if (row) row.status = "rejected";
      return { numUpdatedRows: row ? BigInt(1) : BigInt(0) };
    },
  };
}

function makeUsersRepo(role = "executive", branchId = 1) {
  return {
    findById: async () => ({ role, branch_id: branchId, team_id: null }),
  };
}

function makeTeamsRepo() {
  return {
    findBySupervisorId: async () => undefined,
    findByIdWithSupervisor: async () => undefined,
  };
}

function makeTransaction(txRepos: ApproveRepos): ApproveTransactionRunner {
  return async <T>(op: (r: ApproveRepos) => Promise<T>) => op(txRepos);
}

describe("approveCapacityRequest", () => {
  it("marks request approved and inserts a search grant atomically", async () => {
    const searchGrants = makeSearchCapacityGrantsRepo();
    const capacityRequests = makeCapacityRequestsRepo({
      id: REQUEST_ID,
      user_id: TARGET_USER_ID,
      kind: "search_extra",
      status: "pending",
      requested_amount: 10,
      reason: "need more",
    });

    const txRepos = {
      capacityRequests,
      users: makeUsersRepo(),
      teams: makeTeamsRepo(),
      searchCapacityGrants: searchGrants,
      leadCapacityGrants: makeLeadCapacityGrantsRepo(),
    };

    const result = await approveCapacityRequest(
      { actorUserId: ACTOR_USER_ID, requestId: REQUEST_ID, note: null },
      makeActor(),
      makeTransaction(txRepos),
    );

    expect(result.ok).toBe(true);
    expect(capacityRequests.rows[0].status).toBe("approved");
    expect(searchGrants.rows).toHaveLength(1);
    expect(searchGrants.rows[0].amount).toBe(10);
  });

  it("returns conflict error when request is not pending", async () => {
    const capacityRequests = makeCapacityRequestsRepo({
      id: REQUEST_ID,
      user_id: TARGET_USER_ID,
      kind: "search_extra",
      status: "approved",
      requested_amount: 10,
      reason: "already done",
    });

    const txRepos = {
      capacityRequests,
      users: makeUsersRepo(),
      teams: makeTeamsRepo(),
      searchCapacityGrants: makeSearchCapacityGrantsRepo(),
      leadCapacityGrants: makeLeadCapacityGrantsRepo(),
    };

    const result = await approveCapacityRequest(
      { actorUserId: ACTOR_USER_ID, requestId: REQUEST_ID, note: null },
      makeActor(),
      makeTransaction(txRepos),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("request_not_pending");
    }
  });

  it("returns forbidden when actor cannot manage the target user", async () => {
    const capacityRequests = makeCapacityRequestsRepo({
      id: REQUEST_ID,
      user_id: TARGET_USER_ID,
      kind: "search_extra",
      status: "pending",
      requested_amount: 5,
      reason: "test",
    });

    const searchGrants = makeSearchCapacityGrantsRepo();
    const txRepos: ApproveRepos = {
      capacityRequests,
      // Target is in a different branch
      users: {
        findById: async () => ({
          role: "executive",
          branch_id: 2,
          team_id: null,
        }),
      },
      teams: makeTeamsRepo(),
      searchCapacityGrants: searchGrants,
      leadCapacityGrants: makeLeadCapacityGrantsRepo(),
    };

    const result = await approveCapacityRequest(
      { actorUserId: ACTOR_USER_ID, requestId: REQUEST_ID, note: null },
      makeActor("admin"), // admin in branch 1
      makeTransaction(txRepos),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("forbidden");
    }
    // Grant must not have been inserted
    expect(searchGrants.rows).toHaveLength(0);
  });

  it("does not commit any write when transaction throws mid-way", async () => {
    const searchGrants = makeSearchCapacityGrantsRepo();
    const capacityRequests = makeCapacityRequestsRepo({
      id: REQUEST_ID,
      user_id: TARGET_USER_ID,
      kind: "search_extra",
      status: "pending",
      requested_amount: 5,
      reason: "test",
    });

    // Simulate a transaction that throws after markApproved but before grant
    const failingTransaction: ApproveTransactionRunner = async <T>(
      op: (r: ApproveRepos) => Promise<T>,
    ): Promise<T> => {
      const txRepos: ApproveRepos = {
        capacityRequests: {
          ...capacityRequests,
          markApproved: async () => {
            throw new Error("db connection lost");
          },
        },
        users: makeUsersRepo(),
        teams: makeTeamsRepo(),
        searchCapacityGrants: searchGrants,
        leadCapacityGrants: makeLeadCapacityGrantsRepo(),
      };
      return op(txRepos);
    };

    const result = await approveCapacityRequest(
      { actorUserId: ACTOR_USER_ID, requestId: REQUEST_ID, note: null },
      makeActor(),
      failingTransaction,
    );

    expect(result.ok).toBe(false);
    // Original request row is unchanged (transaction never committed)
    expect(capacityRequests.rows[0].status).toBe("pending");
    expect(searchGrants.rows).toHaveLength(0);
  });
});

describe("rejectCapacityRequest", () => {
  it("marks request rejected when actor has permission and note is provided", async () => {
    const capacityRequests = makeCapacityRequestsRepo({
      id: REQUEST_ID,
      user_id: TARGET_USER_ID,
      kind: "search_extra",
      status: "pending",
      requested_amount: 5,
      reason: "test",
    });

    const txRepos = {
      capacityRequests,
      users: makeUsersRepo(),
      teams: makeTeamsRepo(),
      searchCapacityGrants: makeSearchCapacityGrantsRepo(),
      leadCapacityGrants: makeLeadCapacityGrantsRepo(),
    };

    const result = await rejectCapacityRequest(
      {
        actorUserId: ACTOR_USER_ID,
        requestId: REQUEST_ID,
        note: "not justified",
      },
      makeActor(),
      makeTransaction(txRepos),
    );

    expect(result.ok).toBe(true);
    expect(capacityRequests.rows[0].status).toBe("rejected");
  });

  it("returns validation error when note is empty", async () => {
    const noopTransaction: ApproveTransactionRunner = async () => {
      throw new Error("transaction should not be called");
    };
    const result = await rejectCapacityRequest(
      { actorUserId: ACTOR_USER_ID, requestId: REQUEST_ID, note: "   " },
      makeActor(),
      noopTransaction,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("decision_note_required");
    }
  });
});
