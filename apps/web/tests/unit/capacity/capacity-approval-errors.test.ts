import { describe, expect, it } from "vitest";

import {
  approveCapacityRequest,
  rejectCapacityRequest,
} from "~/server/capacity/application/commands";

import {
  REQUEST_ID,
  TARGET_USER_ID,
  makeApprovalHarness,
  makeContext,
} from "@tests/support/capacity/approval-harness";

describe("capacity approval failures", () => {
  it("returns request_not_found when request does not exist", async () => {
    const harness = makeApprovalHarness({ request: undefined });

    const result = await approveCapacityRequest(makeContext(), harness.port, {
      requestId: REQUEST_ID,
      note: null,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    expect(result.error.code).toBe("request_not_found");
    expect(harness.transactionCalls).toBe(1);
    expect(harness.searchGrants).toEqual([]);
    expect(harness.leadGrants).toEqual([]);
  });

  it("returns request_not_pending when request is already approved", async () => {
    const harness = makeApprovalHarness({
      request: {
        id: REQUEST_ID,
        userId: TARGET_USER_ID,
        kind: "search_extra",
        status: "approved",
        requestedAmount: 5,
        reason: "test",
      },
      targetUser: { role: "executive", branchId: 1, teamId: null },
    });

    const result = await approveCapacityRequest(makeContext(), harness.port, {
      requestId: REQUEST_ID,
      note: null,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    expect(result.error.code).toBe("request_not_pending");
    expect(harness.request?.status).toBe("approved");
    expect(harness.searchGrants).toEqual([]);
    expect(harness.leadGrants).toEqual([]);
  });

  it("returns forbidden and no side effects when actor cannot manage target", async () => {
    const harness = makeApprovalHarness({
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

    const result = await approveCapacityRequest(makeContext("admin"), harness.port, {
      requestId: REQUEST_ID,
      note: null,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    expect(result.error.code).toBe("forbidden");
    expect(harness.request?.status).toBe("pending");
    expect(harness.searchGrants).toEqual([]);
    expect(harness.leadGrants).toEqual([]);
  });

  it("rolls back transaction state when approval throws", async () => {
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
    expect(harness.leadGrants).toEqual([]);
    expect(harness.transactionCalls).toBe(1);
  });

  it("fails fast when rejection note is empty", async () => {
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
      note: "   ",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    expect(result.error.code).toBe("decision_note_required");
    expect(harness.transactionCalls).toBe(0);
    expect(harness.request?.status).toBe("pending");
  });
});
