import type { Insertable, Selectable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

export type SourcingPolicyRow = Selectable<Database["lead_sourcing_policies"]>;
export type NewSourcingPolicyRow = Insertable<
  Database["lead_sourcing_policies"]
>;

export function createSourcingPolicyRepo(db: DatabaseExecutor) {
  return {
    findByBranchId(branchId: number) {
      return db
        .selectFrom("lead_sourcing_policies")
        .selectAll()
        .where("branch_id", "=", branchId)
        .executeTakeFirst();
    },

    upsert(values: NewSourcingPolicyRow) {
      return db
        .insertInto("lead_sourcing_policies")
        .values(values)
        .onConflict((oc) =>
          oc.column("branch_id").doUpdateSet({
            engine_assignment_enabled: values.engine_assignment_enabled,
            updated_at: values.updated_at,
            updated_by_user_id: values.updated_by_user_id,
          }),
        )
        .execute();
    },
  };
}
