import {
  EXECUTIVE_ID,
  EXECUTIVE_OTHER_BRANCH_ID,
  leadGrantsFor,
  makeApprovalContext,
  makeApprovalDeps,
  searchGrantsFor,
  seedRequest,
} from "@tests/support/capacity/approval-runtime";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  resetTestDb,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { approveCapacityRequest } from "~/server/capacity/application/use-cases/approve-capacity-request";
import { rejectCapacityRequest } from "~/server/capacity/application/use-cases/reject-capacity-request";
import { asCapacityRequestId } from "~/server/shared/ids";

describe("capacity approval failures", () => {
  let ctx: TestDbContext;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("capacity-approval-errors");
  });

  afterAll(async () => {
    await cleanupTestDb(ctx);
  });

  beforeEach(async () => {
    await resetTestDb(ctx);
  });

  it("returns request_not_found when the request does not exist", async () => {
    const result = await approveCapacityRequest(
      makeApprovalContext(),
      makeApprovalDeps(ctx),
      {
        requestId: asCapacityRequestId("missing-capacity-request"),
        note: null,
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    expect(result.error.code).toBe("request_not_found");
    expect(await searchGrantsFor(ctx, EXECUTIVE_ID)).toEqual([]);
    expect(await leadGrantsFor(ctx, EXECUTIVE_ID)).toEqual([]);
  });

  it("returns request_not_pending and writes nothing when already approved", async () => {
    const requestId = await seedRequest(ctx, {
      userId: EXECUTIVE_ID,
      kind: "search_extra",
      status: "approved",
      requestedAmount: 5,
      reason: "test",
    });

    const result = await approveCapacityRequest(
      makeApprovalContext(),
      makeApprovalDeps(ctx),
      { requestId, note: null },
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    expect(result.error.code).toBe("request_not_pending");
    expect((await ctx.repos.capacityRequests.findById(requestId))?.status).toBe(
      "approved",
    );
    expect(await searchGrantsFor(ctx, EXECUTIVE_ID)).toEqual([]);
  });

  it("returns forbidden and writes nothing when the actor cannot manage the target", async () => {
    const requestId = await seedRequest(ctx, {
      userId: EXECUTIVE_OTHER_BRANCH_ID,
      kind: "search_extra",
      status: "pending",
      requestedAmount: 5,
      reason: "test",
    });

    const result = await approveCapacityRequest(
      makeApprovalContext({ role: "admin" }),
      makeApprovalDeps(ctx),
      { requestId, note: null },
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    expect(result.error.kind).toBe("forbidden");
    expect((await ctx.repos.capacityRequests.findById(requestId))?.status).toBe(
      "pending",
    );
    expect(await searchGrantsFor(ctx, EXECUTIVE_OTHER_BRANCH_ID)).toEqual([]);
  });

  it("rolls back the approval write when the grant insert fails", async () => {
    const requestId = await seedRequest(ctx, {
      userId: EXECUTIVE_ID,
      kind: "search_extra",
      status: "pending",
      requestedAmount: 5,
      reason: "test",
    });

    await expect(
      approveCapacityRequest(
        makeApprovalContext(),
        makeApprovalDeps(ctx, { failGrantInsert: true }),
        { requestId, note: null },
      ),
    ).rejects.toThrow("db connection lost");

    const stored = await ctx.repos.capacityRequests.findById(requestId);
    expect(stored?.status).toBe("pending");
    expect(stored?.reviewer_user_id).toBe(null);
    expect(await searchGrantsFor(ctx, EXECUTIVE_ID)).toEqual([]);
  });

  it("fails fast and writes nothing when the rejection note is empty", async () => {
    const requestId = await seedRequest(ctx, {
      userId: EXECUTIVE_ID,
      kind: "search_extra",
      status: "pending",
      requestedAmount: 5,
      reason: "test",
    });

    const result = await rejectCapacityRequest(
      makeApprovalContext(),
      makeApprovalDeps(ctx),
      { requestId, note: "   " },
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    expect(result.error.code).toBe("decision_note_required");
    expect((await ctx.repos.capacityRequests.findById(requestId))?.status).toBe(
      "pending",
    );
  });
});
