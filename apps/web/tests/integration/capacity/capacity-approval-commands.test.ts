import {
  EXECUTIVE_ID,
  SUPERUSER_ID,
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

describe("capacity approval commands", () => {
  let ctx: TestDbContext;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("capacity-approval-commands");
  });

  afterAll(async () => {
    await cleanupTestDb(ctx);
  });

  beforeEach(async () => {
    await resetTestDb(ctx);
  });

  it("approves a pending search request and grants search capacity", async () => {
    const requestId = await seedRequest(ctx, {
      userId: EXECUTIVE_ID,
      kind: "search_extra",
      status: "pending",
      requestedAmount: 10,
      reason: "need more",
    });

    const result = await approveCapacityRequest(
      makeApprovalContext(),
      makeApprovalDeps(ctx),
      { requestId, note: null },
    );

    expect(result.ok).toBe(true);
    expect(await ctx.repos.capacityRequests.findById(requestId)).toMatchObject({
      status: "approved",
      reviewer_user_id: SUPERUSER_ID,
      decision_note: null,
    });
    expect(await searchGrantsFor(ctx, EXECUTIVE_ID)).toEqual([
      {
        userId: EXECUTIVE_ID,
        amount: 10,
        reason: "need more",
        actorUserId: SUPERUSER_ID,
      },
    ]);
    expect(await leadGrantsFor(ctx, EXECUTIVE_ID)).toEqual([]);
  });

  it("approves a lead refill request and uses the normalized note as grant reason", async () => {
    const requestId = await seedRequest(ctx, {
      userId: EXECUTIVE_ID,
      kind: "lead_refill_extra",
      status: "pending",
      requestedAmount: 4,
      reason: "old reason",
    });

    const result = await approveCapacityRequest(
      makeApprovalContext(),
      makeApprovalDeps(ctx),
      { requestId, note: "  approved for campaign week  " },
    );

    expect(result.ok).toBe(true);
    expect(await ctx.repos.capacityRequests.findById(requestId)).toMatchObject({
      status: "approved",
      decision_note: "approved for campaign week",
    });
    expect(await leadGrantsFor(ctx, EXECUTIVE_ID)).toEqual([
      {
        userId: EXECUTIVE_ID,
        amount: 4,
        reason: "approved for campaign week",
        actorUserId: SUPERUSER_ID,
      },
    ]);
    expect(await searchGrantsFor(ctx, EXECUTIVE_ID)).toEqual([]);
  });

  it("rejects a pending request with a trimmed decision note", async () => {
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
      { requestId, note: "  not justified  " },
    );

    expect(result.ok).toBe(true);
    expect(await ctx.repos.capacityRequests.findById(requestId)).toMatchObject({
      status: "rejected",
      reviewer_user_id: SUPERUSER_ID,
      decision_note: "not justified",
    });
    expect(await searchGrantsFor(ctx, EXECUTIVE_ID)).toEqual([]);
  });
});
