import type { Insertable, Selectable } from "kysely";

import type { BranchId, UserId } from "~/domain/ids";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import type { Database } from "~/server/platform/database/types";

type LeadSourcingPolicy = {
  branchId: BranchId;
  engineAssignmentEnabled: boolean;
  updatedAt: Date;
  updatedByUserId: UserId;
};

export type LeadSourcingPolicyRepository = {
  findByBranchId(branchId: BranchId): Promise<LeadSourcingPolicy | undefined>;
  upsert(values: LeadSourcingPolicy): Promise<unknown>;
};

type SourcingPolicyRow = Selectable<Database["lead_sourcing_policies"]>;
type NewSourcingPolicyRow = Insertable<Database["lead_sourcing_policies"]>;

function toLeadSourcingPolicy(row: SourcingPolicyRow): LeadSourcingPolicy {
  return {
    branchId: row.branch_id,
    engineAssignmentEnabled: row.engine_assignment_enabled,
    updatedAt: row.updated_at,
    updatedByUserId: row.updated_by_user_id,
  };
}

export function createSourcingPolicyRepo(db: DatabaseExecutor) {
  return {
    async findByBranchId(
      branchId: BranchId,
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
          engine_assignment_enabled: values.engineAssignmentEnabled,
          updated_at: values.updatedAt,
          updated_by_user_id: values.updatedByUserId,
        } satisfies NewSourcingPolicyRow)
        .onConflict((oc) =>
          oc.column("branch_id").doUpdateSet({
            engine_assignment_enabled: values.engineAssignmentEnabled,
            updated_at: values.updatedAt,
            updated_by_user_id: values.updatedByUserId,
          }),
        )
        .execute();
    },
  };
}
