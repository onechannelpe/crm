import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { uploadTestPdf } from "../support/document-fixtures";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

async function createSubmittableNote(ctx: TestDbContext) {
  const noteId = await ctx.repos.chargeNotes.create(1, 1);
  await ctx.repos.chargeNoteItems.create(noteId, 1, 1);
  await uploadTestPdf(ctx, noteId);
  await ctx.db
    .insertInto("inventory_items")
    .values({
      id: 1,
      product_id: 1,
      serial_number: "SN-AUDIT-001",
      status: "available",
      created_at: Date.now(),
    })
    .execute();
  expect(await ctx.repos.inventory.reserveIfAvailable(1)).toBe(true);
  await ctx.repos.inventory.createLock(1, noteId, Date.now() + 60_000);
  return noteId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseChanges(changes: string | null): Record<string, unknown> {
  if (!changes) {
    return {};
  }

  const parsed: unknown = JSON.parse(changes);
  return isRecord(parsed) ? parsed : {};
}

describe("sales audit contracts", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("sales-audit");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("persists stage transition payloads for submit and approve", async () => {
    const noteId = await createSubmittableNote(ctx);
    expect((await ctx.sales.submit(noteId, 1)).ok).toBe(true);
    expect((await ctx.sales.approve(noteId, 2, 1, false)).ok).toBe(true);

    const logs = await ctx.repos.auditLogs.findByEntity("charge_note", noteId);
    const submitted = logs.find(
      (log) => log.action === "charge_note_submitted",
    );
    const approved = logs.find((log) => log.action === "charge_note_approved");

    expect(submitted).toBeDefined();
    expect(approved).toBeDefined();
    expect(submitted?.user_id).toBe(1);
    expect(approved?.user_id).toBe(2);

    const submittedChanges = parseChanges(submitted?.changes ?? null);
    const approvedChanges = parseChanges(approved?.changes ?? null);
    expect(submittedChanges.from).toBe("draft");
    expect(submittedChanges.to).toBe("pending_review");
    expect(approvedChanges.from).toBe("pending_review");
    expect(approvedChanges.to).toBe("approved");
  });

  it("persists reject payload fields and resubmission transition", async () => {
    const noteId = await createSubmittableNote(ctx);
    expect((await ctx.sales.submit(noteId, 1)).ok).toBe(true);

    const rejected = await ctx.sales.reject(noteId, 2, 1, false, [
      { field_id: "dni_file", reviewer_note: "Unreadable image" },
    ]);
    expect(rejected.ok).toBe(true);
    expect((await ctx.sales.submit(noteId, 1)).ok).toBe(true);

    const logs = await ctx.repos.auditLogs.findByEntity("charge_note", noteId);
    const rejectLog = logs.find((log) => log.action === "charge_note_rejected");
    expect(rejectLog).toBeDefined();
    expect(parseChanges(rejectLog?.changes ?? null).fields).toEqual([
      "dni_file",
    ]);

    const submittedLogs = logs.filter(
      (log) => log.action === "charge_note_submitted",
    );
    const resubmission = submittedLogs.find(
      (log) => parseChanges(log.changes).from === "rejected",
    );
    expect(resubmission).toBeDefined();
    expect(parseChanges(resubmission?.changes ?? null).to).toBe(
      "pending_review",
    );
  });
});
