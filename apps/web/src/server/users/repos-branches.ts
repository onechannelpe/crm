import type { Kysely, Selectable } from "kysely";

import type { BranchesTable, Database } from "~/lib/db/types";
import { asBranchId, type BranchId } from "~/server/shared/ids";

export function createBranchesRepo(db: Kysely<Database>) {
  return {
    findById(id: BranchId) {
      return db
        .selectFrom("branches")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst() as Promise<
        (Omit<Selectable<BranchesTable>, "id"> & { id: BranchId }) | undefined
      >;
    },

    findAll() {
      return db.selectFrom("branches").selectAll().execute() as Promise<
        Array<Omit<Selectable<BranchesTable>, "id"> & { id: BranchId }>
      >;
    },
  };
}
