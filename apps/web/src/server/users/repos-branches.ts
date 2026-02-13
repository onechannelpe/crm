import type { Kysely } from "kysely";
import type { Database } from "~/lib/db/schema";

export function createBranchesRepo(db: Kysely<Database>) {
    return {
        findById(id: number) {
            return db.selectFrom("branches").selectAll().where("id", "=", id).executeTakeFirst();
        },

        findAll() {
            return db.selectFrom("branches").selectAll().execute();
        },
    };
}
