import type { Insertable, Selectable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { LeadSourcingPolicy } from "~/server/workflow/infrastructure/ports/entities";

type SourcingPolicyRow = Selectable<Database["lead_sourcing_policies"]>;
type NewSourcingPolicyRow = Insertable<Database["lead_sourcing_policies"]>;

function toLeadSourcingPolicy(row: SourcingPolicyRow): LeadSourcingPolicy {
  return {
    branchId: row.branch_id,
    engineAssignmentEnabled: row.engine_assignment_enabled === 1,
    updatedAt: row.updated_at,
    updatedByUserId: row.updated_by_user_id,
  };
}

export function createSourcingPolicyRepo(db: DatabaseExecutor) {
  return {
    async findByBranchId(
      branchId: number,
    ): Promise<LeadSourcingPolicy | undefined> {
      const row = await db
        .selectFrom("lead_sourcing_policies")
        .selectAll()
        .where("branch_id", "=", branchId)
        .executeTakeFirst();

      return row ? toLeadSourcingPolicy(row) : undefined;
    },

    upsert(values: LeadSourcingPolicy) {
      return db
        .insertInto("lead_sourcing_policies")
        .values({
          branch_id: values.branchId,
          engine_assignment_enabled: values.engineAssignmentEnabled ? 1 : 0,
          updated_at: values.updatedAt,
          updated_by_user_id: values.updatedByUserId,
        } satisfies NewSourcingPolicyRow)
        .onConflict((oc) =>
          oc.column("branch_id").doUpdateSet({
            engine_assignment_enabled: values.engineAssignmentEnabled ? 1 : 0,
            updated_at: values.updatedAt,
            updated_by_user_id: values.updatedByUserId,
          }),
        )
        .execute();
    },
  };
}
