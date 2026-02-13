import type { Kysely } from "kysely";
import type { Database, NewRejectionLog } from "~/lib/db/schema";

export function createRejectionLogsRepo(db: Kysely<Database>) {
    return {
        create(values: NewRejectionLog) {
            return db.insertInto("rejection_logs").values(values).executeTakeFirstOrThrow();
        },

        findByChargeNote(chargeNoteId: number) {
            return db
                .selectFrom("rejection_logs")
                .selectAll()
                .where("charge_note_id", "=", chargeNoteId)
                .orderBy("created_at", "desc")
                .execute();
        },

        markResolved(id: number) {
            return db
                .updateTable("rejection_logs")
                .set({ is_resolved: 1 })
                .where("id", "=", id)
                .execute();
        },
    };
}
