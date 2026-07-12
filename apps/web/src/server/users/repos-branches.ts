import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import type { BranchId } from "~/server/shared/ids";

export function createBranchesRepo(db: Kysely<Database>) {
  return {
    findById(id: BranchId) {
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

export type BranchesRepo = ReturnType<typeof createBranchesRepo>;
