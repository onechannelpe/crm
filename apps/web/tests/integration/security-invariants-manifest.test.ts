import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getPermissions, ROLES } from "../../src/lib/auth/access/rbac";
import { createQuotaService } from "../../src/server/quota/service";
import {
  PERMISSION_MANIFEST,
  QUOTA_ERROR_MANIFEST,
  SALES_ERROR_MANIFEST,
} from "../support/security-manifests";
import type { TestDbContext } from "../support/test-db";
import { cleanupTestDb, createIsolatedTestDb } from "../support/test-db";

async function prepareSubmittableNote(ctx: TestDbContext) {
  const noteId = await ctx.repos.chargeNotes.create(1, 1);
  await ctx.repos.chargeNoteItems.create(noteId, 1, 1);
  await ctx.repos.documents.create({
    charge_note_id: noteId,
    original_name: "dni.pdf",
    mime_type: "application/pdf",
    size_bytes: 120_000,
    sha256: "4717c905ec347b5915318770f92f818ee5ca111b7088f79f2f138b57fd6595d0",
    storage_key:
      "47/17/4717c905ec347b5915318770f92f818ee5ca111b7088f79f2f138b57fd6595d0.blob",
    created_by_user_id: 1,
  });

  await ctx.db
    .insertInto("inventory_items")
    .values({
      id: 1,
      product_id: 1,
      serial_number: "SN-MANIFEST-001",
      status: "available",
      created_at: Date.now(),
    })
    .execute();

  const reserved = await ctx.repos.inventory.reserveIfAvailable(1);
  expect(reserved).toBe(true);
  await ctx.repos.inventory.createLock(1, noteId, Date.now() + 60_000);
  return noteId;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

describe("security invariant manifest", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("security-manifest");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("enforces exact RBAC permission manifest", () => {
    for (const role of ROLES) {
      const expected = PERMISSION_MANIFEST[role];
      const actual = [...getPermissions(role)].toSorted();
      expect(actual).toEqual([...expected].toSorted());
    }
  });

  it("enforces sales workflow deny contracts", async () => {
    const noteA = await ctx.repos.chargeNotes.create(1, 1);
    const rA = await ctx.sales.submit(noteA, 1);
    expect(rA.ok).toBe(false);
    if (rA.ok) {
      throw new Error("Expected missing-items submit contract to fail");
    }
    expect(rA.error).toBe(SALES_ERROR_MANIFEST.missingItems);

    const noteB = await ctx.repos.chargeNotes.create(1, 1);
    await ctx.repos.chargeNoteItems.create(noteB, 1, 1);
    const rB = await ctx.sales.submit(noteB, 1);
    expect(rB.ok).toBe(false);
    if (rB.ok) {
      throw new Error("Expected missing-documents submit contract to fail");
    }
    expect(rB.error).toBe(SALES_ERROR_MANIFEST.missingDocuments);

    const noteC = await ctx.repos.chargeNotes.create(1, 1);
    await ctx.repos.chargeNoteItems.create(noteC, 1, 1);
    await ctx.repos.documents.create({
      charge_note_id: noteC,
      original_name: "dni.pdf",
      mime_type: "application/pdf",
      size_bytes: 120_000,
      sha256:
        "4717c905ec347b5915318770f92f818ee5ca111b7088f79f2f138b57fd6595d0",
      storage_key:
        "47/17/4717c905ec347b5915318770f92f818ee5ca111b7088f79f2f138b57fd6595d0.blob",
      created_by_user_id: 1,
    });
    const rC = await ctx.sales.submit(noteC, 1);
    expect(rC.ok).toBe(false);
    if (rC.ok) {
      throw new Error("Expected missing-lock submit contract to fail");
    }
    expect(rC.error).toBe(SALES_ERROR_MANIFEST.missingInventoryLock);

    const noteD = await prepareSubmittableNote(ctx);
    const submitted = await ctx.sales.submit(noteD, 1);
    expect(submitted.ok).toBe(true);
    const denied = await ctx.sales.approve(noteD, 4, 2, false);
    expect(denied.ok).toBe(false);
    if (denied.ok) {
      throw new Error("Expected cross-branch review deny contract to fail");
    }
    expect(denied.error).toBe(SALES_ERROR_MANIFEST.crossBranchReview);
  });

  it("enforces quota deny contracts", async () => {
    const quota = createQuotaService(ctx.repos);
    const day = today();

    const first = await quota.allocate(2, 1, 2, day);
    expect(first.ok).toBe(true);

    const duplicate = await quota.allocate(2, 1, 1, day);
    expect(duplicate.ok).toBe(false);
    if (duplicate.ok) {
      throw new Error("Expected duplicate daily allocation to fail");
    }
    expect(duplicate.error).toBe(QUOTA_ERROR_MANIFEST.duplicateDailyAllocation);

    const c1 = await quota.consume(1, 1);
    const c2 = await quota.consume(1, 1);
    expect(c1.ok).toBe(true);
    expect(c2.ok).toBe(true);
    if (!c1.ok || !c2.ok) {
      throw new Error("Expected first two quota consume calls to succeed");
    }
    expect(c1.value).toBe(1);
    expect(c2.value).toBe(0);

    const exhausted = await quota.consume(1, 1);
    expect(exhausted.ok).toBe(false);
    if (exhausted.ok) {
      throw new Error("Expected exhausted quota contract to fail");
    }
    expect(exhausted.error).toBe(QUOTA_ERROR_MANIFEST.exhausted2of2);
  });
});
