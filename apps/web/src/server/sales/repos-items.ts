import type { Kysely } from "kysely";
import type { Database } from "~/lib/db/schema";

export function createChargeNoteItemsRepo(db: Kysely<Database>) {
    return {
        create(chargeNoteId: number, productId: number, quantity: number) {
            return db
                .insertInto("charge_note_items")
                .values({ charge_note_id: chargeNoteId, product_id: productId, quantity })
                .executeTakeFirstOrThrow();
        },

        findByChargeNote(chargeNoteId: number) {
            return db
                .selectFrom("charge_note_items")
                .selectAll()
                .where("charge_note_id", "=", chargeNoteId)
                .execute();
        },
    };
}
