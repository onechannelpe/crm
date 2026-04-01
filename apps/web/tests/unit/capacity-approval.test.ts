import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Role } from "~/lib/auth/access/rbac";

import {
  approveCapacityRequest,
  rejectCapacityRequest,
} from "../../src/server/capacity/application/commands";
import type { AppContext } from "../../src/server/shared/action-runtime";

const ACTOR_USER_ID = 99;
const TARGET_USER_ID = 1;
const REQUEST_ID = 42;

type RequestRow = {
  id: number;
  user_id: number;
  kind: "search_extra" | "lead_refill_extra";
  status: "pending" | "approved" | "rejected";
  requested_amount: number;
  reason: string;
  decided_by_user_id?: number | null;
  decision_note?: string | null;
};

type GrantRow = {
  user_id: number;
  amount: number;
  reason: string;
  actor_user_id: number;
};

type ManagedUser = {
  role: Role;
  branch_id: number;
  team_id: number | null;
};

function makeContext(role: Role = "admin"): AppContext {
  return {
    actor: {
      sessionId: "test-session",
      userId: ACTOR_USER_ID,
      role,
      branchId: 1,
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

function makeHarness(input: {
  request: RequestRow | undefined;
  targetUser?: ManagedUser | undefined;
  supervisedTeamId?: number | undefined;
  failMarkApproved?: boolean;
}) {
  let request = input.request ? { ...input.request } : undefined;
  let searchGrants: GrantRow[] = [];
  let leadGrants: GrantRow[] = [];
  let transactionCalls = 0;

  const buildTxRepos = () => {
    const draftRequest = request ? { ...request } : undefined;
    const draftSearchGrants = [...searchGrants];
    const draftLeadGrants = [...leadGrants];

    return {
      txRepos: {
        capacityRequests: {
          findById: async (id: number) =>
            draftRequest?.id === id ? draftRequest : undefined,
          markApproved: async (
            id: number,
            actorUserId: number,
            note: string | null,
          ) => {
            if (input.failMarkApproved) {
              throw new Error("db connection lost");
            }
            if (!draftRequest || draftRequest.id !== id) {
              return { numUpdatedRows: BigInt(0) };
            }
            draftRequest.status = "approved";
            draftRequest.decided_by_user_id = actorUserId;
            draftRequest.decision_note = note;
            return { numUpdatedRows: BigInt(1) };
          },
          markRejected: async (
            id: number,
            actorUserId: number,
            note: string | null,
          ) => {
            if (!draftRequest || draftRequest.id !== id) {
              return { numUpdatedRows: BigInt(0) };
            }
            draftRequest.status = "rejected";
            draftRequest.decided_by_user_id = actorUserId;
            draftRequest.decision_note = note;
            return { numUpdatedRows: BigInt(1) };
          },
        },
        users: {
          findById: async (userId: number) =>
            userId === input.request?.user_id ? input.targetUser : undefined,
        },
        teams: {
          findBySupervisorId: async (userId: number) =>
            userId === ACTOR_USER_ID && input.supervisedTeamId
              ? { id: input.supervisedTeamId }
              : undefined,
          findByIdWithSupervisor: async () => undefined,
        },
        searchCapacityGrants: {
          insert: async (values: GrantRow) => {
            draftSearchGrants.push(values);
          },
          findByUserAndPeriod: async () => [],
        },
        leadCapacityGrants: {
          insert: async (values: GrantRow) => {
            draftLeadGrants.push(values);
          },
          findByUserAndDate: async () => [],
        },
      },
      commit() {
        request = draftRequest;
        searchGrants = draftSearchGrants;
        leadGrants = draftLeadGrants;
      },
    };
  };

  return {
    get request() {
      return request;
    },
    get searchGrants() {
      return searchGrants;
    },
    get leadGrants() {
      return leadGrants;
    },
    get transactionCalls() {
      return transactionCalls;
    },
    deps: {
      enforceApprovalRateLimit: async () => undefined,
      async runInRepositoryTransaction<T>(
        operation: (
          repos: ReturnType<typeof buildTxRepos>["txRepos"],
        ) => Promise<T>,
      ): Promise<T> {
        transactionCalls += 1;
        const tx = buildTxRepos();
        const result = await operation(tx.txRepos);
        tx.commit();
        return result;
      },
    },
  };
}

describe("capacity approval commands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("approves a pending search request and grants search capacity", async () => {
    const harness = makeHarness({
      request: {
        id: REQUEST_ID,
        user_id: TARGET_USER_ID,
        kind: "search_extra",
        status: "pending",
        requested_amount: 10,
        reason: "need more",
      },
      targetUser: { role: "executive", branch_id: 1, team_id: null },
    });

    const result = await approveCapacityRequest(makeContext(), harness.deps, {
      requestId: REQUEST_ID,
      note: null,
    });

    expect(result.ok).toBe(true);
    expect(harness.request).toMatchObject({
      status: "approved",
      decided_by_user_id: ACTOR_USER_ID,
      decision_note: null,
    });
    expect(harness.searchGrants).toEqual([
      {
        user_id: TARGET_USER_ID,
        amount: 10,
        reason: "need more",
        actor_user_id: ACTOR_USER_ID,
      },
    ]);
    expect(harness.leadGrants).toEqual([]);
  });

  it("approves a lead refill request and uses the normalized decision note as the grant reason", async () => {
    const harness = makeHarness({
      request: {
        id: REQUEST_ID,
        user_id: TARGET_USER_ID,
        kind: "lead_refill_extra",
        status: "pending",
        requested_amount: 4,
        reason: "old reason",
      },
      targetUser: { role: "executive", branch_id: 1, team_id: null },
    });

    const result = await approveCapacityRequest(makeContext(), harness.deps, {
      requestId: REQUEST_ID,
      note: "  approved for campaign week  ",
    });

    expect(result.ok).toBe(true);
    expect(harness.request).toMatchObject({
      status: "approved",
      decision_note: "approved for campaign week",
    });
    expect(harness.leadGrants).toEqual([
      {
        user_id: TARGET_USER_ID,
        amount: 4,
        reason: "approved for campaign week",
        actor_user_id: ACTOR_USER_ID,
      },
    ]);
    expect(harness.searchGrants).toEqual([]);
  });

  it("returns forbidden and leaves state untouched when the actor cannot manage the target executive", async () => {
    const harness = makeHarness({
      request: {
        id: REQUEST_ID,
        user_id: TARGET_USER_ID,
        kind: "search_extra",
        status: "pending",
        requested_amount: 5,
        reason: "test",
      },
      targetUser: { role: "executive", branch_id: 2, team_id: null },
    });

    const result = await approveCapacityRequest(
      makeContext("admin"),
      harness.deps,
      {
        requestId: REQUEST_ID,
        note: null,
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected forbidden result");
    }
    expect(result.error.code).toBe("forbidden");
    expect(harness.request?.status).toBe("pending");
    expect(harness.searchGrants).toEqual([]);
    expect(harness.leadGrants).toEqual([]);
  });

  it("rolls back transaction state when approval fails after the request is loaded", async () => {
    const harness = makeHarness({
      request: {
        id: REQUEST_ID,
        user_id: TARGET_USER_ID,
        kind: "search_extra",
        status: "pending",
        requested_amount: 5,
        reason: "test",
      },
      targetUser: { role: "executive", branch_id: 1, team_id: null },
      failMarkApproved: true,
    });

    const result = await approveCapacityRequest(makeContext(), harness.deps, {
      requestId: REQUEST_ID,
      note: null,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected unexpected error result");
    }
    expect(result.error.code).toBe("unexpected");
    expect(harness.request?.status).toBe("pending");
    expect(harness.searchGrants).toEqual([]);
    expect(harness.transactionCalls).toBe(1);
  });

  it("rejects a pending request with a trimmed decision note", async () => {
    const harness = makeHarness({
      request: {
        id: REQUEST_ID,
        user_id: TARGET_USER_ID,
        kind: "search_extra",
        status: "pending",
        requested_amount: 5,
        reason: "test",
      },
      targetUser: { role: "executive", branch_id: 1, team_id: null },
    });

    const result = await rejectCapacityRequest(makeContext(), harness.deps, {
      requestId: REQUEST_ID,
      note: "  not justified  ",
    });

    expect(result.ok).toBe(true);
    expect(harness.request).toMatchObject({
      status: "rejected",
      decided_by_user_id: ACTOR_USER_ID,
      decision_note: "not justified",
    });
  });

  it("fails fast when rejection note is empty", async () => {
    const harness = makeHarness({
      request: {
        id: REQUEST_ID,
        user_id: TARGET_USER_ID,
        kind: "search_extra",
        status: "pending",
        requested_amount: 5,
        reason: "test",
      },
      targetUser: { role: "executive", branch_id: 1, team_id: null },
    });

    const result = await rejectCapacityRequest(makeContext(), harness.deps, {
      requestId: REQUEST_ID,
      note: "   ",
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected validation error");
    }
    expect(result.error.code).toBe("decision_note_required");
    expect(harness.transactionCalls).toBe(0);
    expect(harness.request?.status).toBe("pending");
  });
});
