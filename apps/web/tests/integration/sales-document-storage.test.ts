import { access, rm } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { PDF_BYTES, uploadTestPdf } from "../support/document-fixtures";
import type { TestDbContext } from "../support/test-db";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  drainDocumentJobs,
} from "../support/test-db";

describe("sales document storage lifecycle", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("sales-document-storage");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("does not delete shared blob when a duplicate upload metadata insert fails", async () => {
    const noteId = await ctx.repos.chargeNotes.create(1, 1);
    const firstDocumentId = await uploadTestPdf(ctx, noteId);

    const firstRow = await ctx.repos.documents.findById(firstDocumentId);
    expect(firstRow).toBeDefined();
    if (!firstRow) {
      throw new Error("Expected first document row");
    }
    const firstBlob =
      await ctx.repos.documents.findBlobByDocumentId(firstDocumentId);
    expect(firstBlob).toBeDefined();
    if (!firstBlob) {
      throw new Error("Expected first document blob");
    }

    await expect(
      ctx.documents.upload({
        chargeNoteId: 999_999,
        userId: 1,
        originalName: "dni.pdf",
        mimeType: "application/pdf",
        contentBytes: PDF_BYTES,
      }),
    ).rejects.toThrow("FOREIGN KEY constraint failed");

    await expect(
      access(join(ctx.storageRoot, firstBlob.storage_key)),
    ).resolves.toBeUndefined();
  });

  it("quarantines documents with missing blobs during integrity sweep", async () => {
    const noteId = await ctx.repos.chargeNotes.create(1, 1);
    await ctx.repos.chargeNoteItems.create(noteId, 1, 1);

    const documentId = await uploadTestPdf(ctx, noteId);
    const row = await ctx.repos.documents.findById(documentId);
    expect(row).toBeDefined();
    if (!row) {
      throw new Error("Expected document row");
    }
    const blob = await ctx.repos.documents.findBlobByDocumentId(documentId);
    expect(blob).toBeDefined();
    if (!blob) {
      throw new Error("Expected document blob");
    }

    await rm(join(ctx.storageRoot, blob.storage_key), { force: true });

    const quarantined = await ctx.documents.runIntegritySweep(200, null);
    expect(quarantined).toBe(1);

    const refreshed = await ctx.repos.documents.findById(documentId);
    expect(refreshed?.status).toBe("deleted_soft");

    const events = await ctx.db
      .selectFrom("sales_document_events")
      .selectAll()
      .where("document_id", "=", documentId)
      .where("event_type", "=", "integrity_missing_blob")
      .execute();
    expect(events.length).toBe(1);

    const result = await ctx.sales.submit(noteId, 1);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected submit without active documents to fail");
    }
    expect(result.error).toBe(
      "At least one document is required before submission",
    );
  });

  it("keeps shared blob until the final document reference is hard deleted", async () => {
    const noteA = await ctx.repos.chargeNotes.create(1, 1);
    const noteB = await ctx.repos.chargeNotes.create(1, 1);
    const docA = await uploadTestPdf(ctx, noteA);
    const docB = await uploadTestPdf(ctx, noteB);

    const blobA = await ctx.repos.documents.findBlobByDocumentId(docA);
    const blobB = await ctx.repos.documents.findBlobByDocumentId(docB);
    expect(blobA?.sha256).toBeDefined();
    expect(blobA?.sha256).toBe(blobB?.sha256);
    expect(blobA?.ref_count).toBe(2);
    if (!blobA) {
      throw new Error("Expected shared blob");
    }

    await ctx.repos.documents.markSoftDeleted(docA, 1);
    await ctx.db
      .updateTable("sales_documents")
      .set({ deleted_at: 0 })
      .where("id", "=", docA)
      .execute();
    await ctx.documents.runRetentionSweep(null);
    await drainDocumentJobs(ctx);

    const blobAfterFirstDelete =
      await ctx.repos.documents.findBlobByDocumentId(docB);
    expect(blobAfterFirstDelete?.ref_count).toBe(1);
    await expect(
      access(join(ctx.storageRoot, blobA.storage_key)),
    ).resolves.toBeUndefined();

    await ctx.repos.documents.markSoftDeleted(docB, 1);
    await ctx.db
      .updateTable("sales_documents")
      .set({ deleted_at: 0 })
      .where("id", "=", docB)
      .execute();
    await ctx.documents.runRetentionSweep(null);
    await drainDocumentJobs(ctx);

    const blobAfterSecondDelete =
      await ctx.repos.documents.findBlobByDocumentId(docB);
    expect(blobAfterSecondDelete).toBeUndefined();
    await expect(
      access(join(ctx.storageRoot, blobA.storage_key)),
    ).rejects.toThrow("ENOENT");
  });
});
