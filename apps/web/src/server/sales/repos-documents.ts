import { sql, type Kysely } from "kysely";

import type { Database } from "~/lib/db/schema";

export function createDocumentsRepo(db: Kysely<Database>) {
  const upsertBlobReference = (
    trx: Kysely<Database>,
    values: {
      sha256: string;
      storage_key: string;
      size_bytes: number;
    },
    updatedAt: number,
  ) =>
    trx
      .insertInto("sales_document_blobs")
      .values({
        sha256: values.sha256,
        storage_key: values.storage_key,
        size_bytes: values.size_bytes,
        ref_count: 1,
        created_at: updatedAt,
        updated_at: updatedAt,
      })
      .onConflict((oc) =>
        oc.column("sha256").doUpdateSet({
          ref_count: sql`ref_count + 1`,
          updated_at: updatedAt,
        }),
      )
      .executeTakeFirstOrThrow();

  return {
    create(values: {
      charge_note_id: number;
      original_name: string;
      mime_type: string;
      size_bytes: number;
      sha256: string;
      storage_key: string;
      created_by_user_id: number;
    }) {
      const createdAt = Date.now();
      return db.transaction().execute(async (trx) => {
        await upsertBlobReference(trx, values, createdAt);

        const inserted = await trx
          .insertInto("sales_documents")
          .values({
            charge_note_id: values.charge_note_id,
            original_name: values.original_name,
            mime_type: values.mime_type,
            blob_sha256: values.sha256,
            status: "available",
            created_by_user_id: values.created_by_user_id,
            created_at: createdAt,
            deleted_at: null,
          })
          .returning("id")
          .executeTakeFirstOrThrow();

        await trx
          .insertInto("sales_document_events")
          .values({
            document_id: inserted.id,
            charge_note_id: values.charge_note_id,
            actor_user_id: values.created_by_user_id,
            event_type: "uploaded",
            details: null,
            created_at: createdAt,
          })
          .executeTakeFirstOrThrow();

        return inserted;
      });
    },

    createPendingUpload(values: {
      charge_note_id: number;
      original_name: string;
      mime_type: string;
      size_bytes: number;
      sha256: string;
      storage_key: string;
      created_by_user_id: number;
    }) {
      const createdAt = Date.now();
      return db.transaction().execute(async (trx) => {
        await upsertBlobReference(trx, values, createdAt);

        return trx
          .insertInto("sales_documents")
          .values({
            charge_note_id: values.charge_note_id,
            original_name: values.original_name,
            mime_type: values.mime_type,
            blob_sha256: values.sha256,
            status: "pending_upload",
            created_by_user_id: values.created_by_user_id,
            created_at: createdAt,
            deleted_at: null,
          })
          .returning("id")
          .executeTakeFirstOrThrow();
      });
    },

    async findById(documentId: number) {
      return db
        .selectFrom("sales_documents")
        .selectAll("sales_documents")
        .where("id", "=", documentId)
        .executeTakeFirst();
    },

    async findBlobByDocumentId(documentId: number) {
      return db
        .selectFrom("sales_documents")
        .innerJoin(
          "sales_document_blobs",
          "sales_document_blobs.sha256",
          "sales_documents.blob_sha256",
        )
        .selectAll("sales_document_blobs")
        .where("sales_documents.id", "=", documentId)
        .executeTakeFirst();
    },

    async findBlobBySha(blobSha256: string) {
      return db
        .selectFrom("sales_document_blobs")
        .selectAll()
        .where("sha256", "=", blobSha256)
        .executeTakeFirst();
    },

    findByChargeNote(chargeNoteId: number) {
      return db
        .selectFrom("sales_documents")
        .innerJoin(
          "sales_document_blobs",
          "sales_document_blobs.sha256",
          "sales_documents.blob_sha256",
        )
        .select([
          "sales_documents.id",
          "sales_documents.charge_note_id",
          "sales_documents.original_name",
          "sales_documents.mime_type",
          "sales_documents.blob_sha256",
          "sales_documents.status",
          "sales_documents.created_by_user_id",
          "sales_documents.created_at",
          "sales_documents.deleted_at",
          "sales_document_blobs.size_bytes",
        ])
        .where("sales_documents.charge_note_id", "=", chargeNoteId)
        .where("sales_documents.status", "=", "available")
        .orderBy("sales_documents.created_at", "desc")
        .execute();
    },

    async countByChargeNote(chargeNoteId: number) {
      const row = await db
        .selectFrom("sales_documents")
        .select(db.fn.countAll().as("count"))
        .where("charge_note_id", "=", chargeNoteId)
        .where("status", "=", "available")
        .executeTakeFirst();
      return Number(row?.count ?? 0);
    },

    findRetentionPolicy() {
      return db
        .selectFrom("sales_document_policies")
        .selectAll()
        .where("scope", "=", "global")
        .executeTakeFirst();
    },

    findHardDeleteCandidates(cutoffMs: number) {
      return db
        .selectFrom("sales_documents")
        .select(["id", "blob_sha256"])
        .where("status", "=", "deleted_soft")
        .where("deleted_at", "<=", cutoffMs)
        .execute();
    },

    listAvailableForIntegrityScan(afterId: number, limit: number) {
      return db
        .selectFrom("sales_documents")
        .innerJoin(
          "sales_document_blobs",
          "sales_document_blobs.sha256",
          "sales_documents.blob_sha256",
        )
        .select([
          "sales_documents.id",
          "sales_documents.charge_note_id",
          "sales_documents.status",
          "sales_document_blobs.storage_key",
        ])
        .where("sales_documents.status", "=", "available")
        .where("sales_documents.id", ">", afterId)
        .orderBy("sales_documents.id", "asc")
        .limit(limit)
        .execute();
    },

    markSoftDeleted(documentId: number, actorUserId: number | null) {
      const now = Date.now();
      return db.transaction().execute(async (trx) => {
        const row = await trx
          .selectFrom("sales_documents")
          .select(["id", "charge_note_id", "status"])
          .where("id", "=", documentId)
          .executeTakeFirst();
        if (!row || row.status !== "available") {
          return false;
        }

        await trx
          .updateTable("sales_documents")
          .set({
            status: "deleted_soft",
            deleted_at: now,
          })
          .where("id", "=", documentId)
          .executeTakeFirstOrThrow();

        await trx
          .insertInto("sales_document_events")
          .values({
            document_id: documentId,
            charge_note_id: row.charge_note_id,
            actor_user_id: actorUserId,
            event_type: "soft_deleted",
            details: null,
            created_at: now,
          })
          .executeTakeFirstOrThrow();

        return true;
      });
    },

    markUploadedAvailable(documentId: number, actorUserId: number | null) {
      const now = Date.now();
      return db.transaction().execute(async (trx) => {
        const row = await trx
          .selectFrom("sales_documents")
          .select(["id", "charge_note_id", "status"])
          .where("id", "=", documentId)
          .executeTakeFirst();
        if (!row || row.status !== "pending_upload") {
          return false;
        }

        await trx
          .updateTable("sales_documents")
          .set({
            status: "available",
          })
          .where("id", "=", documentId)
          .executeTakeFirstOrThrow();

        await trx
          .insertInto("sales_document_events")
          .values({
            document_id: row.id,
            charge_note_id: row.charge_note_id,
            actor_user_id: actorUserId,
            event_type: "uploaded",
            details: null,
            created_at: now,
          })
          .executeTakeFirstOrThrow();

        return true;
      });
    },

    markUploadFailedAndRelease(documentId: number, actorUserId: number | null) {
      const now = Date.now();
      return db.transaction().execute(async (trx) => {
        const row = await trx
          .selectFrom("sales_documents")
          .select(["id", "charge_note_id", "status", "blob_sha256"])
          .where("id", "=", documentId)
          .executeTakeFirst();
        if (!row || row.status !== "pending_upload") {
          return false;
        }

        await trx
          .updateTable("sales_documents")
          .set({
            status: "upload_failed",
            blob_sha256: null,
            deleted_at: now,
          })
          .where("id", "=", documentId)
          .executeTakeFirstOrThrow();

        if (row.blob_sha256) {
          await trx
            .updateTable("sales_document_blobs")
            .set({
              ref_count: sql`CASE WHEN ref_count > 0 THEN ref_count - 1 ELSE 0 END`,
              updated_at: now,
            })
            .where("sha256", "=", row.blob_sha256)
            .executeTakeFirstOrThrow();
        }

        await trx
          .insertInto("sales_document_events")
          .values({
            document_id: row.id,
            charge_note_id: row.charge_note_id,
            actor_user_id: actorUserId,
            event_type: "upload_failed",
            details: null,
            created_at: now,
          })
          .executeTakeFirstOrThrow();

        return true;
      });
    },

    releaseForHardDelete(documentId: number, actorUserId: number | null) {
      const now = Date.now();
      return db.transaction().execute(async (trx) => {
        const row = await trx
          .selectFrom("sales_documents")
          .innerJoin(
            "sales_document_blobs",
            "sales_document_blobs.sha256",
            "sales_documents.blob_sha256",
          )
          .select([
            "sales_documents.id",
            "sales_documents.charge_note_id",
            "sales_documents.status",
            "sales_documents.blob_sha256",
            "sales_document_blobs.storage_key",
          ])
          .where("sales_documents.id", "=", documentId)
          .executeTakeFirst();
        if (!row || row.status !== "deleted_soft") {
          return null;
        }
        if (!row.blob_sha256) {
          return null;
        }

        await trx
          .updateTable("sales_documents")
          .set({
            status: "deleted_hard",
            blob_sha256: null,
            deleted_at: now,
          })
          .where("id", "=", documentId)
          .executeTakeFirstOrThrow();

        await trx
          .insertInto("sales_document_events")
          .values({
            document_id: documentId,
            charge_note_id: row.charge_note_id,
            actor_user_id: actorUserId,
            event_type: "hard_deleted",
            details: null,
            created_at: now,
          })
          .executeTakeFirstOrThrow();

        await trx
          .updateTable("sales_document_blobs")
          .set({
            ref_count: sql`CASE WHEN ref_count > 0 THEN ref_count - 1 ELSE 0 END`,
            updated_at: now,
          })
          .where("sha256", "=", row.blob_sha256)
          .executeTakeFirstOrThrow();

        const blob = await trx
          .selectFrom("sales_document_blobs")
          .select(["sha256", "storage_key", "ref_count"])
          .where("sha256", "=", row.blob_sha256)
          .executeTakeFirst();

        return {
          blobSha256: row.blob_sha256,
          storageKey: row.storage_key,
          shouldDeleteBlob: (blob?.ref_count ?? 0) < 1,
        };
      });
    },

    deleteBlobIfUnreferencedWithFile(
      blobSha256: string,
      deleteFile: (storageKey: string) => Promise<void>,
    ) {
      return db.transaction().execute(async (trx) => {
        const row = await trx
          .selectFrom("sales_document_blobs")
          .select(["sha256", "storage_key", "ref_count"])
          .where("sha256", "=", blobSha256)
          .executeTakeFirst();
        if (!row || row.ref_count !== 0) {
          return false;
        }

        await deleteFile(row.storage_key);

        const deleted = await trx
          .deleteFrom("sales_document_blobs")
          .where("sha256", "=", blobSha256)
          .where("ref_count", "=", 0)
          .executeTakeFirst();

        return Number(deleted.numDeletedRows ?? 0) > 0;
      });
    },

    listUnreferencedBlobs(limit: number) {
      return db
        .selectFrom("sales_document_blobs")
        .select(["sha256", "storage_key"])
        .where("ref_count", "=", 0)
        .orderBy("updated_at", "asc")
        .limit(limit)
        .execute();
    },

    markMissingBlobIntegrity(documentId: number, actorUserId: number | null) {
      const now = Date.now();
      return db.transaction().execute(async (trx) => {
        const row = await trx
          .selectFrom("sales_documents")
          .select(["id", "charge_note_id", "status"])
          .where("id", "=", documentId)
          .executeTakeFirst();
        if (!row || row.status !== "available") {
          return false;
        }

        await trx
          .updateTable("sales_documents")
          .set({
            status: "deleted_soft",
            deleted_at: now,
          })
          .where("id", "=", documentId)
          .executeTakeFirstOrThrow();

        await trx
          .insertInto("sales_document_events")
          .values({
            document_id: row.id,
            charge_note_id: row.charge_note_id,
            actor_user_id: actorUserId,
            event_type: "integrity_missing_blob",
            details: null,
            created_at: now,
          })
          .executeTakeFirstOrThrow();

        return true;
      });
    },
  };
}
