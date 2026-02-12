import type { Kysely } from "kysely";
import type { Database, NewInteractionLog } from "~/lib/db/schema";

export function createInteractionLogsRepo(db: Kysely<Database>) {
    return {
        create(values: NewInteractionLog) {
            return db.insertInto("interaction_logs").values(values).executeTakeFirstOrThrow();
        },

        findByContact(contactId: number) {
            return db
                .selectFrom("interaction_logs")
                .selectAll()
                .where("contact_id", "=", contactId)
                .orderBy("created_at", "desc")
                .execute();
        },
    };
}
