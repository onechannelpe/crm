import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";

export function createTeamsRepo(db: Kysely<Database>) {
  return {
    findByBranch(branchId: number) {
      return db
        .selectFrom("teams")
        .selectAll()
        .where("branch_id", "=", branchId)
        .orderBy("name", "asc")
        .execute();
    },

    findById(id: number) {
      return db
        .selectFrom("teams")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },
  };
}
