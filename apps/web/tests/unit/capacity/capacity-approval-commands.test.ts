import { describe, expect, it } from "vitest";

import {
  approveCapacityRequest,
  rejectCapacityRequest,
} from "~/server/capacity/application/commands";

import {
  ACTOR_USER_ID,
  REQUEST_ID,
  TARGET_USER_ID,
  makeApprovalHarness,
  makeContext,
} from "@tests/support/capacity/approval-harness";

describe("capacity approval commands", () => {
  it("approves a pending search request and grants search capacity", async () => {
    const harness = makeApprovalHarness({
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
    if (!result.ok) throw new Error("Expected success");
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
    expect(harness.transactionCalls).toBe(1);
  });

  it("approves a lead refill request and uses normalized note as grant reason", async () => {
    const harness = makeApprovalHarness({
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
    if (!result.ok) throw new Error("Expected success");
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
    expect(harness.transactionCalls).toBe(1);
  });

  it("rejects a pending request with a trimmed decision note", async () => {
    const harness = makeApprovalHarness({
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
    if (!result.ok) throw new Error("Expected success");
    expect(harness.request).toMatchObject({
      status: "rejected",
      decidedByUserId: ACTOR_USER_ID,
      decisionNote: "not justified",
    });
    expect(harness.transactionCalls).toBe(1);
  });
});
