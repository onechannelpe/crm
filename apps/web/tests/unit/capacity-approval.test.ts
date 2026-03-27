import { describe, expect, it } from "vitest";
import { beforeEach, vi } from "vitest";

import type { Role } from "~/lib/auth/access/rbac";
import {
  approveCapacityRequest,
  rejectCapacityRequest,
} from "~/server/capacity/application/commands";
import { createCapacityDeps } from "~/server/capacity/infrastructure/deps";
import type { AppContext } from "~/server/shared/action-runtime";

import {
  makeLeadCapacityGrantsRepo,
  makeSearchCapacityGrantsRepo,
} from "../support/capacity-fakes";

const { runInRepositoryTransactionMock, capacityReposMock } = vi.hoisted(
  () => ({
    runInRepositoryTransactionMock: vi.fn(),
    capacityReposMock: {
      capacityRequests: {
        findById: vi.fn(),
        markApproved: vi.fn(),
        markRejected: vi.fn(),
      },
      users: {
        findById: vi.fn(),
      },
      teams: {
        findBySupervisorId: vi.fn(),
        findByIdWithSupervisor: vi.fn(),
      },
      searchCapacityGrants: {
        insert: vi.fn(),
      },
      leadCapacityGrants: {
        insert: vi.fn(),
      },
    },
  }),
);

vi.mock("../../src/server/shared/context", () => ({
  repos: capacityReposMock,
  rateLimitDeps: {},
  runInRepositoryTransaction: runInRepositoryTransactionMock,
}));

vi.mock("../../src/lib/security/action-rate-limit", () => ({
  checkActionRateLimit: vi.fn(),
}));

const ACTOR_USER_ID = 99;
const TARGET_USER_ID = 1;
const REQUEST_ID = 42;

function makeContext(role: Role = "admin"): AppContext {
  return {
    actor: {
      sessionId: "test",
      userId: ACTOR_USER_ID,
      role,
      branchId: 1,
      onboardingCompleted: true,
      sessionClass: "app" as const,
      primaryAuthMethod: "password" as const,
      strongAuthMethod: null,
      strongAuthAt: null,
    },
    requestId: "req-test",
    traceId: "trace-test",
    ipAddress: "127.0.0.1",
    userAgent: null,
    publicOrigin: "http://localhost:3000",
    now: Date.now,
  };
}

type RequestRow = {
  id: number;
  user_id: number;
  kind: "search_extra" | "lead_refill";
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

function makeUsersRepo(role: Role = "executive", branchId = 1) {
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

function installRepos(txRepos: {
  capacityRequests: ReturnType<typeof makeCapacityRequestsRepo>;
  users:
    | ReturnType<typeof makeUsersRepo>
    | {
        findById: () => Promise<{
          role: Role;
          branch_id: number;
          team_id: number | null;
        }>;
      };
  teams: ReturnType<typeof makeTeamsRepo>;
  searchCapacityGrants: {
    insert: (values: {
      user_id: number;
      amount: number;
      reason: string;
      actor_user_id: number;
    }) => Promise<void>;
  };
  leadCapacityGrants: {
    insert: (values: {
      user_id: number;
      amount: number;
      reason: string;
      actor_user_id: number;
    }) => Promise<void>;
  };
}) {
  capacityReposMock.capacityRequests.findById.mockImplementation(
    txRepos.capacityRequests.findById,
  );
  capacityReposMock.capacityRequests.markApproved.mockImplementation(
    txRepos.capacityRequests.markApproved,
  );
  capacityReposMock.capacityRequests.markRejected.mockImplementation(
    txRepos.capacityRequests.markRejected,
  );
  capacityReposMock.users.findById.mockImplementation(txRepos.users.findById);
  capacityReposMock.teams.findBySupervisorId.mockImplementation(
    txRepos.teams.findBySupervisorId,
  );
  capacityReposMock.teams.findByIdWithSupervisor.mockImplementation(
    txRepos.teams.findByIdWithSupervisor,
  );
  capacityReposMock.searchCapacityGrants.insert.mockImplementation(
    txRepos.searchCapacityGrants.insert,
  );
  capacityReposMock.leadCapacityGrants.insert.mockImplementation(
    txRepos.leadCapacityGrants.insert,
  );
  runInRepositoryTransactionMock.mockImplementation(async (operation) =>
    operation(capacityReposMock),
  );
}

describe("approveCapacityRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

    installRepos({
      capacityRequests,
      users: makeUsersRepo(),
      teams: makeTeamsRepo(),
      searchCapacityGrants: searchGrants,
      leadCapacityGrants: makeLeadCapacityGrantsRepo(),
    });

    const result = await approveCapacityRequest(
      makeContext(),
      createCapacityDeps(),
      {
        requestId: REQUEST_ID,
        note: null,
      },
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

    installRepos({
      capacityRequests,
      users: makeUsersRepo(),
      teams: makeTeamsRepo(),
      searchCapacityGrants: makeSearchCapacityGrantsRepo(),
      leadCapacityGrants: makeLeadCapacityGrantsRepo(),
    });

    const result = await approveCapacityRequest(
      makeContext(),
      createCapacityDeps(),
      {
        requestId: REQUEST_ID,
        note: null,
      },
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
    installRepos({
      capacityRequests,
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
    });

    const result = await approveCapacityRequest(
      makeContext("admin"), // admin in branch 1
      createCapacityDeps(),
      { requestId: REQUEST_ID, note: null },
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
    installRepos({
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
    });

    const result = await approveCapacityRequest(
      makeContext(),
      createCapacityDeps(),
      {
        requestId: REQUEST_ID,
        note: null,
      },
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

    installRepos({
      capacityRequests,
      users: makeUsersRepo(),
      teams: makeTeamsRepo(),
      searchCapacityGrants: makeSearchCapacityGrantsRepo(),
      leadCapacityGrants: makeLeadCapacityGrantsRepo(),
    });

    const result = await rejectCapacityRequest(
      makeContext(),
      createCapacityDeps(),
      {
        requestId: REQUEST_ID,
        note: "not justified",
      },
    );

    expect(result.ok).toBe(true);
    expect(capacityRequests.rows[0].status).toBe("rejected");
  });

  it("returns validation error when note is empty", async () => {
    runInRepositoryTransactionMock.mockImplementation(async () => {
      throw new Error("transaction should not be called");
    });
    const result = await rejectCapacityRequest(
      makeContext(),
      createCapacityDeps(),
      {
        requestId: REQUEST_ID,
        note: "   ",
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("decision_note_required");
    }
  });
});
