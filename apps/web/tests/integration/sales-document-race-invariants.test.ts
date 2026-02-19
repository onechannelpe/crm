import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { DocumentBlobStore } from "../../src/server/sales/document-blob-store";
import { createSalesDocumentService } from "../../src/server/sales/document-service";
import { PDF_BYTES } from "../support/document-fixtures";
import type { TestDbContext } from "../support/test-db";
import { cleanupTestDb, createIsolatedTestDb } from "../support/test-db";

const FIXTURE_SHA256 = "ab".repeat(32);
const FIXTURE_STORAGE_KEY = `${FIXTURE_SHA256.slice(0, 2)}/${FIXTURE_SHA256.slice(2, 4)}/${FIXTURE_SHA256}.blob`;

describe("sales document race invariants", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("sales-document-race-invariants");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("returns success if metadata commit succeeded, even when post-commit file check fails", async () => {
    const noteId = await ctx.repos.chargeNotes.create(1, 1);
    let putCalls = 0;
    let deleteCalls = 0;

    const blobStore: DocumentBlobStore = {
      async put() {
        putCalls += 1;
        if (putCalls > 1) {
          throw new Error("repair put failed");
        }
        return {
          sha256: FIXTURE_SHA256,
          storageKey: FIXTURE_STORAGE_KEY,
          absolutePath: "/tmp/test.blob",
          sizeBytes: PDF_BYTES.byteLength,
          created: true,
        };
      },
      async deleteByStorageKey() {
        deleteCalls += 1;
      },
      async existsByStorageKey() {
        return false;
      },
    };
    const service = createSalesDocumentService(ctx.repos, blobStore);

    const result = await service.upload({
      chargeNoteId: noteId,
      userId: 1,
      originalName: "dni.pdf",
      mimeType: "application/pdf",
      contentBytes: PDF_BYTES,
    });

    expect(result.ok).toBe(true);
    expect(deleteCalls).toBe(0);
    expect(await ctx.repos.documents.countByChargeNote(noteId)).toBe(1);
  });

  it("fails safe when a concurrent re-reference is attempted during deletion", async () => {
    const noteId = await ctx.repos.chargeNotes.create(1, 1);
    const inserted = await ctx.repos.documents.create({
      charge_note_id: noteId,
      original_name: "dni.pdf",
      mime_type: "application/pdf",
      size_bytes: PDF_BYTES.byteLength,
      sha256: FIXTURE_SHA256,
      storage_key: FIXTURE_STORAGE_KEY,
      created_by_user_id: 1,
    });
    await ctx.repos.documents.markSoftDeleted(inserted.id, 1);
    await ctx.db
      .updateTable("sales_documents")
      .set({ deleted_at: 0 })
      .where("id", "=", inserted.id)
      .execute();

    const files = new Set([FIXTURE_STORAGE_KEY]);
    let raceTriggered = false;
    const blobStore: DocumentBlobStore = {
      async put() {
        files.add(FIXTURE_STORAGE_KEY);
        return {
          sha256: FIXTURE_SHA256,
          storageKey: FIXTURE_STORAGE_KEY,
          absolutePath: "/tmp/test.blob",
          sizeBytes: PDF_BYTES.byteLength,
          created: false,
        };
      },
      async deleteByStorageKey(storageKey: string) {
        if (!raceTriggered) {
          raceTriggered = true;
          const noteId2 = await ctx.repos.chargeNotes.create(2, 1);
          await ctx.repos.documents.create({
            charge_note_id: noteId2,
            original_name: "dni-copy.pdf",
            mime_type: "application/pdf",
            size_bytes: PDF_BYTES.byteLength,
            sha256: FIXTURE_SHA256,
            storage_key: FIXTURE_STORAGE_KEY,
            created_by_user_id: 1,
          });
        }
        files.delete(storageKey);
      },
      async existsByStorageKey(storageKey: string) {
        return files.has(storageKey);
      },
    };
    const service = createSalesDocumentService(ctx.repos, blobStore);

    await expect(service.runRetentionSweep(null)).rejects.toThrow(
      "database is locked",
    );

    const liveBlob = await ctx.repos.documents.findBlobBySha(FIXTURE_SHA256);
    expect(liveBlob).toBeDefined();
    expect(liveBlob?.ref_count).toBe(0);
    expect(files.has(FIXTURE_STORAGE_KEY)).toBe(true);
  });
});
