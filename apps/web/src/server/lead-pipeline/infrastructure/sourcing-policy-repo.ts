import type { Insertable, Selectable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

type LeadSourcingPolicyRow = Selectable<Database["lead_sourcing_policies"]>;
type NewLeadSourcingPolicyRow = Insertable<Database["lead_sourcing_policies"]>;

export function createLeadSourcingPolicyRepo(db: DatabaseExecutor) {
  return {
    findByBranchId(
      branchId: number,
    ): Promise<LeadSourcingPolicyRow | undefined> {
      return db
        .selectFrom("lead_sourcing_policies")
        .selectAll()
        .where("branch_id", "=", branchId)
        .executeTakeFirst();
    },

    upsert(values: NewLeadSourcingPolicyRow) {
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
