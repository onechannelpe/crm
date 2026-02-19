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

  it("marks upload_failed and returns Err when file persistence fails after metadata commit", async () => {
    const noteId = await ctx.repos.chargeNotes.create(1, 1);
    const fixedTimestamp = Date.now();
    let deleteCalls = 0;

    const blobStore: DocumentBlobStore = {
      prepare() {
        return {
          sha256: FIXTURE_SHA256,
          storageKey: FIXTURE_STORAGE_KEY,
          absolutePath: "/tmp/test.blob",
          sizeBytes: PDF_BYTES.byteLength,
        };
      },
      async put() {
        throw new Error("simulated write failure");
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

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected upload failure");
    }
    expect(result.error).toBe("Failed to persist document content");
    expect(deleteCalls).toBe(0);
    expect(await ctx.repos.documents.countByChargeNote(noteId)).toBe(0);

    const persistedRows = await ctx.db
      .selectFrom("sales_documents")
      .selectAll()
      .where("charge_note_id", "=", noteId)
      .execute();
    expect(persistedRows.length).toBe(1);
    expect(persistedRows[0]?.status).toBe("upload_failed");
    expect(persistedRows[0]?.blob_sha256).toBe(null);
    expect((persistedRows[0]?.deleted_at ?? 0) > 0).toBe(true);

    const blob = await ctx.repos.documents.findBlobBySha(FIXTURE_SHA256);
    expect(blob?.ref_count).toBe(0);

    const failedEvents = await ctx.db
      .selectFrom("sales_document_events")
      .selectAll()
      .where("charge_note_id", "=", noteId)
      .where("event_type", "=", "upload_failed")
      .execute();
    expect(failedEvents.length).toBe(1);
    expect((failedEvents[0]?.created_at ?? 0) <= fixedTimestamp + 10_000).toBe(
      true,
    );
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
      prepare() {
        return {
          sha256: FIXTURE_SHA256,
          storageKey: FIXTURE_STORAGE_KEY,
          absolutePath: "/tmp/test.blob",
          sizeBytes: PDF_BYTES.byteLength,
        };
      },
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
