import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";

export function createBranchesRepo(db: Kysely<Database>) {
  return {
    findById(id: string) {
      return db
        .selectFrom("branches")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },

    findAll() {
      return db.selectFrom("branches").selectAll().execute();
    },
  };
}
