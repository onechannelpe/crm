import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/schema";

export function createDocumentsRepo(db: Kysely<Database>) {
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
        const inserted = await trx
          .insertInto("sales_documents")
          .values({
            ...values,
            status: "available",
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

    async findById(documentId: number) {
      return db
        .selectFrom("sales_documents")
        .selectAll()
        .where("id", "=", documentId)
        .executeTakeFirst();
    },

    findByChargeNote(chargeNoteId: number) {
      return db
        .selectFrom("sales_documents")
        .selectAll()
        .where("charge_note_id", "=", chargeNoteId)
        .where("status", "=", "available")
        .orderBy("created_at", "desc")
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
        .selectAll()
        .where("status", "=", "deleted_soft")
        .where("deleted_at", "<=", cutoffMs)
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

    markHardDeleted(documentId: number, actorUserId: number | null) {
      const now = Date.now();
      return db.transaction().execute(async (trx) => {
        const row = await trx
          .selectFrom("sales_documents")
          .select(["id", "charge_note_id"])
          .where("id", "=", documentId)
          .executeTakeFirst();
        if (!row) {
          return;
        }

        await trx
          .updateTable("sales_documents")
          .set({
            status: "deleted_hard",
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
      });
    },
  };
}
