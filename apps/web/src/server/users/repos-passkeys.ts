import type { Kysely } from "kysely";
import type { Database } from "~/lib/db/schema";

export function createPasskeysRepo(db: Kysely<Database>) {
    return {
        findById(id: string) {
            return db.selectFrom("passkeys").selectAll().where("id", "=", id).executeTakeFirst();
        },

        findByUser(userId: number) {
            return db.selectFrom("passkeys").selectAll().where("user_id", "=", userId).execute();
        },

        create(values: {
            id: string;
            user_id: number;
            public_key: string;
            counter: number;
            transports: string | null;
        }) {
            return db
                .insertInto("passkeys")
                .values({ ...values, created_at: Date.now() })
                .executeTakeFirstOrThrow();
        },

        updateCounter(id: string, counter: number) {
            return db
                .updateTable("passkeys")
                .set({ counter, last_used_at: Date.now() })
                .where("id", "=", id)
                .execute();
        },
    };
}
