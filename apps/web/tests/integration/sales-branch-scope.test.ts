import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { uploadTestPdf } from "../support/document-fixtures";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

describe("sales branch scoping", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("sales-branch-scope");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("returns pending notes only for the requested branch", async () => {
    const noteLima = await ctx.repos.chargeNotes.create(1, 1);
    const noteNorte = await ctx.repos.chargeNotes.create(2, 3);
    await ctx.repos.chargeNotes.updateStatus(noteLima, "pending_review");
    await ctx.repos.chargeNotes.updateStatus(noteNorte, "pending_review");

    const limaRows =
      await ctx.repos.chargeNotes.findPendingReviewWithContactsByBranch(1);
    const norteRows =
      await ctx.repos.chargeNotes.findPendingReviewWithContactsByBranch(2);

    expect(limaRows).toHaveLength(1);
    expect(limaRows[0].id).toBe(noteLima);
    expect(norteRows).toHaveLength(1);
    expect(norteRows[0].id).toBe(noteNorte);
  });

  it("allows cross-branch approval only with superuser bypass", async () => {
    const noteLima = await ctx.repos.chargeNotes.create(1, 1);
    await ctx.repos.chargeNotes.updateStatus(noteLima, "pending_review");

    await ctx.repos.chargeNoteItems.create(noteLima, 1, 1);
    await uploadTestPdf(ctx, noteLima);

    await ctx.db
      .insertInto("inventory_items")
      .values({
        id: 1,
        product_id: 1,
        serial_number: "SN-SUP-1",
        status: "reserved",
        created_at: Date.now(),
      })
      .execute();
    await ctx.repos.inventory.createLock(1, noteLima, Date.now() + 60_000);

    const blocked = await ctx.sales.approve(noteLima, 4, 2, false);
    expect(blocked.ok).toBe(false);
    if (blocked.ok) {
      throw new Error("Expected cross-branch approval without bypass to fail");
    }
    expect(blocked.error).toBe("Cannot review a sale from another branch");

    const bypassed = await ctx.sales.approve(noteLima, 5, 2, true);
    expect(bypassed.ok).toBe(true);
  });
});
