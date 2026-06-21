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
  type TestDbContext,
} from "@tests/support/runtime/db";
import { afterEach, describe, expect, it } from "vitest";

import { approveCapacityRequest } from "~/server/capacity/application/use-cases/approve-capacity-request";
import { rejectCapacityRequest } from "~/server/capacity/application/use-cases/reject-capacity-request";

describe("capacity approval failures", () => {
  let ctx: TestDbContext | null = null;

  afterEach(async () => {
    if (ctx) {
      await cleanupTestDb(ctx);
      ctx = null;
    }
  });

  it("returns request_not_found when the request does not exist", async () => {
    ctx = await createIsolatedTestDb("capacity-not-found");

    const result = await approveCapacityRequest(
      makeApprovalContext(),
      makeApprovalDeps(ctx),
      { requestId: 999, note: null },
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected failure");
    expect(result.error.code).toBe("request_not_found");
    expect(await searchGrantsFor(ctx, EXECUTIVE_ID)).toEqual([]);
    expect(await leadGrantsFor(ctx, EXECUTIVE_ID)).toEqual([]);
  });

  it("returns request_not_pending and writes nothing when already approved", async () => {
    ctx = await createIsolatedTestDb("capacity-not-pending");
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
    ctx = await createIsolatedTestDb("capacity-forbidden");
    const requestId = await seedRequest(ctx, {
      userId: EXECUTIVE_OTHER_BRANCH_ID,
      kind: "search_extra",
      status: "pending",
      requestedAmount: 5,
      reason: "test",
    });

    const result = await approveCapacityRequest(
      makeApprovalContext({ role: "admin", branchId: 1 }),
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
    ctx = await createIsolatedTestDb("capacity-rollback");
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
    ctx = await createIsolatedTestDb("capacity-empty-note");
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
