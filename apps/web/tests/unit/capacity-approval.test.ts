import { describe, expect, it } from "vitest";

import type { Role } from "~/lib/auth/access/rbac";

import {
  approveCapacityRequest,
  rejectCapacityRequest,
} from "../../src/server/capacity/application/commands";
import type {
  CapacityApprovalPort,
  CapacityApprovalTxPort,
} from "../../src/server/capacity/application/ports";
import type { AppContext } from "../../src/server/shared/action-runtime";

const ACTOR_USER_ID = 99;
const TARGET_USER_ID = 1;
const REQUEST_ID = 42;

type RequestRow = {
  id: number;
  userId: number;
  kind: "search_extra" | "lead_refill_extra";
  status: "pending" | "approved" | "rejected" | "canceled";
  requestedAmount: number;
  reason: string;
  decidedByUserId?: number | null;
  decisionNote?: string | null;
};

type GrantRow = {
  userId: number;
  amount: number;
  reason: string;
  actorUserId: number;
};

type ManagedUser = {
  role: Role;
  branchId: number;
  teamId: number | null;
};

function makeContext(role: Role = "admin"): AppContext {
  return {
    actor: {
      id: "test-session",
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
  failMarkApproved?: boolean;
}) {
  let request = input.request ? { ...input.request } : undefined;
  let searchGrants: GrantRow[] = [];
  let leadGrants: GrantRow[] = [];
  let transactionCalls = 0;

  const buildTxPort = () => {
    const draftRequest = request ? { ...request } : undefined;
    const draftSearchGrants = [...searchGrants];
    const draftLeadGrants = [...leadGrants];

    return {
      tx: {
        findRequestById: async (id: number) =>
          draftRequest?.id === id ? draftRequest : undefined,
        markRequestApproved: async (
          id: number,
          actorUserId: number,
          note: string | null,
        ) => {
          if (input.failMarkApproved) {
            throw new Error("db connection lost");
          }
          if (!draftRequest || draftRequest.id !== id) {
            return false;
          }
          draftRequest.status = "approved";
          draftRequest.decidedByUserId = actorUserId;
          draftRequest.decisionNote = note;
          return true;
        },
        markRequestRejected: async (
          id: number,
          actorUserId: number,
          note: string,
        ) => {
          if (!draftRequest || draftRequest.id !== id) {
            return false;
          }
          draftRequest.status = "rejected";
          draftRequest.decidedByUserId = actorUserId;
          draftRequest.decisionNote = note;
          return true;
        },
        findManagedUserById: async (userId: number) =>
          userId === input.request?.userId ? input.targetUser : undefined,
        findManagedTeamById: async (_teamId: number) => undefined,
        findBranchSupervisors: async (_branchId: number) => [],
        grantSearchCapacity: async (values: GrantRow) => {
          draftSearchGrants.push(values);
        },
        grantLeadCapacity: async (values: GrantRow) => {
          draftLeadGrants.push(values);
        },
      } satisfies CapacityApprovalTxPort,
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
    port: {
      enforceApprovalRateLimit: async () => undefined,
      async withTransaction<T>(
        operation: (tx: CapacityApprovalTxPort) => Promise<T>,
      ): Promise<T> {
        transactionCalls += 1;
        const transaction = buildTxPort();
        const result = await operation(transaction.tx);
        transaction.commit();
        return result;
      },
    } satisfies CapacityApprovalPort,
  };
}

describe("capacity approval commands", () => {
  it("approves a pending search request and grants search capacity", async () => {
    const harness = makeHarness({
      request: {
        id: REQUEST_ID,
        userId: TARGET_USER_ID,
        kind: "search_extra",
        status: "pending",
        requestedAmount: 10,
        reason: "need more",
      },
      targetUser: { role: "executive", branchId: 1, teamId: null },
    });

    const result = await approveCapacityRequest(makeContext(), harness.port, {
      requestId: REQUEST_ID,
      note: null,
    });

    expect(result.ok).toBe(true);
    expect(harness.request).toMatchObject({
      status: "approved",
      decidedByUserId: ACTOR_USER_ID,
      decisionNote: null,
    });
    expect(harness.searchGrants).toEqual([
      {
        userId: TARGET_USER_ID,
        amount: 10,
        reason: "need more",
        actorUserId: ACTOR_USER_ID,
      },
    ]);
    expect(harness.leadGrants).toEqual([]);
  });

  it("approves a lead refill request and uses the normalized decision note as the grant reason", async () => {
    const harness = makeHarness({
      request: {
        id: REQUEST_ID,
        userId: TARGET_USER_ID,
        kind: "lead_refill_extra",
        status: "pending",
        requestedAmount: 4,
        reason: "old reason",
      },
      targetUser: { role: "executive", branchId: 1, teamId: null },
    });

    const result = await approveCapacityRequest(makeContext(), harness.port, {
      requestId: REQUEST_ID,
      note: "  approved for campaign week  ",
    });

    expect(result.ok).toBe(true);
    expect(harness.request).toMatchObject({
      status: "approved",
      decisionNote: "approved for campaign week",
    });
    expect(harness.leadGrants).toEqual([
      {
        userId: TARGET_USER_ID,
        amount: 4,
        reason: "approved for campaign week",
        actorUserId: ACTOR_USER_ID,
      },
    ]);
    expect(harness.searchGrants).toEqual([]);
  });

  it("returns forbidden and leaves state untouched when the actor cannot manage the target executive", async () => {
    const harness = makeHarness({
      request: {
        id: REQUEST_ID,
        userId: TARGET_USER_ID,
        kind: "search_extra",
        status: "pending",
        requestedAmount: 5,
        reason: "test",
      },
      targetUser: { role: "executive", branchId: 2, teamId: null },
    });

    const result = await approveCapacityRequest(
      makeContext("admin"),
      harness.port,
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
        userId: TARGET_USER_ID,
        kind: "search_extra",
        status: "pending",
        requestedAmount: 5,
        reason: "test",
      },
      targetUser: { role: "executive", branchId: 1, teamId: null },
      failMarkApproved: true,
    });

    await expect(
      approveCapacityRequest(makeContext(), harness.port, {
        requestId: REQUEST_ID,
        note: null,
      }),
    ).rejects.toThrow("db connection lost");

    expect(harness.request?.status).toBe("pending");
    expect(harness.searchGrants).toEqual([]);
    expect(harness.transactionCalls).toBe(1);
  });

  it("rejects a pending request with a trimmed decision note", async () => {
    const harness = makeHarness({
      request: {
        id: REQUEST_ID,
        userId: TARGET_USER_ID,
        kind: "search_extra",
        status: "pending",
        requestedAmount: 5,
        reason: "test",
      },
      targetUser: { role: "executive", branchId: 1, teamId: null },
    });

    const result = await rejectCapacityRequest(makeContext(), harness.port, {
      requestId: REQUEST_ID,
      note: "  not justified  ",
    });

    expect(result.ok).toBe(true);
    expect(harness.request).toMatchObject({
      status: "rejected",
      decidedByUserId: ACTOR_USER_ID,
      decisionNote: "not justified",
    });
  });

  it("fails fast when rejection note is empty", async () => {
    const harness = makeHarness({
      request: {
        id: REQUEST_ID,
        userId: TARGET_USER_ID,
        kind: "search_extra",
        status: "pending",
        requestedAmount: 5,
        reason: "test",
      },
      targetUser: { role: "executive", branchId: 1, teamId: null },
    });

    const result = await rejectCapacityRequest(makeContext(), harness.port, {
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
