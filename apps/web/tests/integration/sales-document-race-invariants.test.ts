import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { DocumentBlobStore } from "../../src/server/sales/document-blob-store";
import { createDocumentJobProcessor } from "../../src/server/sales/document-job-processor";
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

  it("marks upload_failed when queued persistence job fails", async () => {
    const noteId = await ctx.repos.chargeNotes.create(1, 1);
    const fixedTimestamp = Date.now();

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
      async deleteByStorageKey() {},
      async existsByStorageKey() {
        return false;
      },
    };
    const service = createSalesDocumentService(ctx.repos, blobStore);
    const processor = createDocumentJobProcessor(ctx.repos, blobStore);

    const result = await service.upload({
      chargeNoteId: noteId,
      userId: 1,
      originalName: "dni.pdf",
      mimeType: "application/pdf",
      contentBytes: PDF_BYTES,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected upload queue success");
    }
    await processor.runBatch(20, 1_000);
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

  it("retries delete jobs when blob delete is temporarily busy", async () => {
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
        const error = new Error(`busy deleting ${storageKey}`) as Error & {
          code?: string;
        };
        error.code = "SQLITE_BUSY";
        throw error;
      },
      async existsByStorageKey(storageKey: string) {
        return files.has(storageKey);
      },
    };
    const service = createSalesDocumentService(ctx.repos, blobStore);

    await expect(service.runRetentionSweep(null)).resolves.toBe(1);
    await expect(service.runRetentionSweep(null)).resolves.toBe(0);
    await expect(service.runRetentionSweep(null)).resolves.toBe(0);

    const queuedBeforeProcessing = await ctx.db
      .selectFrom("sales_document_gc")
      .select((eb) => eb.fn.countAll().as("count"))
      .where("blob_sha256", "=", FIXTURE_SHA256)
      .executeTakeFirstOrThrow();
    expect(Number(queuedBeforeProcessing.count)).toBe(1);

    const processor = createDocumentJobProcessor(ctx.repos, blobStore);
    const processed = await processor.runBatch(20, 1_000);
    expect(processed).toBe(0);

    const liveBlob = await ctx.repos.documents.findBlobBySha(FIXTURE_SHA256);
    expect(liveBlob).toBeDefined();
    expect(liveBlob?.ref_count).toBe(0);
    expect(files.has(FIXTURE_STORAGE_KEY)).toBe(true);

    const gcRows = await ctx.db
      .selectFrom("sales_document_gc")
      .selectAll()
      .where("blob_sha256", "=", FIXTURE_SHA256)
      .execute();
    expect(gcRows.length).toBe(1);
    expect(gcRows[0]?.state).toBe("retry_wait");
  });

  it("keeps blob gc non-terminal when blob is referenced again", async () => {
    const noteA = await ctx.repos.chargeNotes.create(1, 1);
    const docA = await ctx.repos.documents.create({
      charge_note_id: noteA,
      original_name: "dni.pdf",
      mime_type: "application/pdf",
      size_bytes: PDF_BYTES.byteLength,
      sha256: FIXTURE_SHA256,
      storage_key: FIXTURE_STORAGE_KEY,
      created_by_user_id: 1,
    });
    await ctx.repos.documents.markSoftDeleted(docA.id, 1);
    await ctx.db
      .updateTable("sales_documents")
      .set({ deleted_at: 0 })
      .where("id", "=", docA.id)
      .execute();

    await expect(ctx.documents.runRetentionSweep(null)).resolves.toBe(1);

    const noteB = await ctx.repos.chargeNotes.create(1, 1);
    await ctx.repos.documents.create({
      charge_note_id: noteB,
      original_name: "dni.pdf",
      mime_type: "application/pdf",
      size_bytes: PDF_BYTES.byteLength,
      sha256: FIXTURE_SHA256,
      storage_key: FIXTURE_STORAGE_KEY,
      created_by_user_id: 1,
    });

    const processor = createDocumentJobProcessor(ctx.repos, {
      prepare() {
        return {
          sha256: FIXTURE_SHA256,
          storageKey: FIXTURE_STORAGE_KEY,
          absolutePath: "/tmp/test.blob",
          sizeBytes: PDF_BYTES.byteLength,
        };
      },
      async put() {
        return {
          sha256: FIXTURE_SHA256,
          storageKey: FIXTURE_STORAGE_KEY,
          absolutePath: "/tmp/test.blob",
          sizeBytes: PDF_BYTES.byteLength,
          created: false,
        };
      },
      async deleteByStorageKey() {},
      async existsByStorageKey() {
        return true;
      },
    });
    const processed = await processor.runDeleteJobs(20, 1_000);
    expect(processed).toBe(0);

    const gcAfterReferencedRun = await ctx.db
      .selectFrom("sales_document_gc")
      .selectAll()
      .where("blob_sha256", "=", FIXTURE_SHA256)
      .executeTakeFirstOrThrow();
    expect(gcAfterReferencedRun.state).toBe("idle");

    const docB = await ctx.db
      .selectFrom("sales_documents")
      .select(["id"])
      .where("charge_note_id", "=", noteB)
      .where("status", "=", "available")
      .executeTakeFirstOrThrow();
    await ctx.repos.documents.markSoftDeleted(docB.id, 1);
    await ctx.db
      .updateTable("sales_documents")
      .set({ deleted_at: 0 })
      .where("id", "=", docB.id)
      .execute();

    await expect(ctx.documents.runRetentionSweep(null)).resolves.toBe(1);
    const gcAfterSecondSweep = await ctx.db
      .selectFrom("sales_document_gc")
      .selectAll()
      .where("blob_sha256", "=", FIXTURE_SHA256)
      .executeTakeFirstOrThrow();
    expect(gcAfterSecondSweep.state).toBe("queued");
  });
});
