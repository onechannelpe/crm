import type { Kysely } from "kysely";
import type { Database } from "~/lib/db/schema";

export function createDocumentsRepo(db: Kysely<Database>) {
    return {
        create(values: {
            charge_note_id: number;
            filename: string;
            filepath: string;
            mimetype: string;
            size: number;
        }) {
            return db
                .insertInto("document_attachments")
                .values({ ...values, version: 1, created_at: Date.now() })
                .executeTakeFirstOrThrow();
        },

        findByChargeNote(chargeNoteId: number) {
            return db
                .selectFrom("document_attachments")
                .selectAll()
                .where("charge_note_id", "=", chargeNoteId)
                .orderBy("created_at", "desc")
                .execute();
        },
    };
}
