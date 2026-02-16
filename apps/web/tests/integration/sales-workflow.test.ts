import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { TestDbContext } from "../support/test-db";

import { cleanupTestDb, createIsolatedTestDb } from "../support/test-db";

async function prepareSubmittableNote(
  ctx: TestDbContext,
  status: "draft" | "rejected" = "draft",
) {
  const noteId = await ctx.repos.chargeNotes.create(1, 1);
  if (status === "rejected") {
    await ctx.repos.chargeNotes.updateStatus(noteId, "rejected");
  }

  await ctx.repos.chargeNoteItems.create(noteId, 1, 1);
  await ctx.repos.documents.create({
    charge_note_id: noteId,
    filename: "dni.pdf",
    filepath: `uploads/${noteId}/dni.pdf`,
    mimetype: "application/pdf",
    size: 120_000,
  });

  await ctx.db
    .insertInto("inventory_items")
    .values({
      id: 1,
      product_id: 1,
      serial_number: "SN-TEST-001",
      status: "available",
      created_at: Date.now(),
    })
    .execute();

  const reserved = await ctx.repos.inventory.reserveIfAvailable(1);
  expect(reserved).toBe(true);
  await ctx.repos.inventory.createLock(1, noteId, Date.now() + 30 * 60 * 1000);

  return noteId;
}

describe("sales workflow invariants", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("sales-workflow");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("rejects submit when items are missing", async () => {
    const noteId = await ctx.repos.chargeNotes.create(1, 1);
    const result = await ctx.sales.submit(noteId, 1);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected submit without items to fail");
    }
    expect(result.error).toBe(
      "At least one product item is required before submission",
    );
  });

  it("rejects submit when documents are missing", async () => {
    const noteId = await ctx.repos.chargeNotes.create(1, 1);
    await ctx.repos.chargeNoteItems.create(noteId, 1, 1);
    const result = await ctx.sales.submit(noteId, 1);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected submit without documents to fail");
    }
    expect(result.error).toBe(
      "At least one document is required before submission",
    );
  });

  it("rejects submit when inventory lock is missing", async () => {
    const noteId = await ctx.repos.chargeNotes.create(1, 1);
    await ctx.repos.chargeNoteItems.create(noteId, 1, 1);
    await ctx.repos.documents.create({
      charge_note_id: noteId,
      filename: "dni.pdf",
      filepath: `uploads/${noteId}/dni.pdf`,
      mimetype: "application/pdf",
      size: 120_000,
    });
    const result = await ctx.sales.submit(noteId, 1);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected submit without inventory lock to fail");
    }
    expect(result.error).toBe(
      "An active inventory lock is required before submission",
    );
  });

  it("prevents cross-branch approval", async () => {
    const noteId = await prepareSubmittableNote(ctx);
    const submitted = await ctx.sales.submit(noteId, 1);
    expect(submitted.ok).toBe(true);

    const result = await ctx.sales.approve(noteId, 4, 2, false);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected cross-branch approval without bypass to fail");
    }
    expect(result.error).toBe("Cannot review a sale from another branch");
  });

  it("resolves unresolved rejection logs when resubmitting", async () => {
    const noteId = await prepareSubmittableNote(ctx, "rejected");
    await ctx.repos.rejectionLogs.create({
      charge_note_id: noteId,
      reviewer_id: 2,
      field_id: "dni_file",
      reviewer_note: "Unreadable image",
      is_resolved: 0,
      created_at: Date.now(),
    });

    const result = await ctx.sales.submit(noteId, 1);
    expect(result.ok).toBe(true);

    const unresolved =
      await ctx.repos.rejectionLogs.findUnresolvedByChargeNote(noteId);
    expect(unresolved.length).toBe(0);
  });

  it("marks inventory sold and clears lock on approval", async () => {
    const noteId = await prepareSubmittableNote(ctx);
    const submitted = await ctx.sales.submit(noteId, 1);
    expect(submitted.ok).toBe(true);

    const approved = await ctx.sales.approve(noteId, 2, 1, false);
    expect(approved.ok).toBe(true);

    const lock = await ctx.repos.inventory.findAnyLockByChargeNote(noteId);
    expect(lock).toBeUndefined();

    const item = await ctx.repos.inventory.findById(1);
    expect(item?.status).toBe("sold");
  });

  it("emits review notification on sale submission", async () => {
    const noteId = await prepareSubmittableNote(ctx);
    const submitted = await ctx.sales.submit(noteId, 1);
    expect(submitted.ok).toBe(true);

    const reviewerFeed = await ctx.repos.appNotifications.listByUser(2, 10);
    expect(reviewerFeed.length).toBe(1);
    expect(reviewerFeed[0]?.event_type).toBe("sale.submitted");
    expect(reviewerFeed[0]?.action_url).toBe("/validation");
  });

  it("emits executive notification on rejection", async () => {
    const noteId = await prepareSubmittableNote(ctx);
    const submitted = await ctx.sales.submit(noteId, 1);
    expect(submitted.ok).toBe(true);

    const rejected = await ctx.sales.reject(noteId, 2, 1, false, [
      { field_id: "dni_file", reviewer_note: "No legible" },
    ]);
    expect(rejected.ok).toBe(true);

    const executiveFeed = await ctx.repos.appNotifications.listByUser(1, 10);
    const rejection = executiveFeed.find(
      (it) => it.event_type === "sale.rejected",
    );
    expect(rejection).toBeDefined();
    expect(rejection?.action_url).toBe(`/sales/${noteId}/fix`);
  });
});
