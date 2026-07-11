import type { Insertable, Selectable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { BranchId, UserId } from "~/server/shared/ids";

type RateProposalPolicyDefault = {
  branchId: BranchId;
  validityDays: number;
  updatedAt: Date;
  updatedByUserId: UserId;
};

export type RateProposalPolicyRepository = {
  findByBranchId(
    branchId: BranchId,
  ): Promise<RateProposalPolicyDefault | undefined>;
  upsert(values: RateProposalPolicyDefault): Promise<unknown>;
};

type RateProposalPolicyRow = Selectable<
  Database["workflow_rate_proposal_policies"]
>;

type NewRateProposalPolicyRow = Insertable<
  Database["workflow_rate_proposal_policies"]
>;

function toRateProposalPolicyDefault(
  row: RateProposalPolicyRow,
): RateProposalPolicyDefault {
  return {
    branchId: row.branch_id,
    validityDays: row.validity_days,
    updatedAt: row.updated_at,
    updatedByUserId: row.updated_by_user_id,
  };
}

export function createRateProposalPolicyRepo(
  db: DatabaseExecutor,
): RateProposalPolicyRepository {
  return {
    async findByBranchId(
      branchId: BranchId,
    ): Promise<RateProposalPolicyDefault | undefined> {
      const row = await db
        .selectFrom("workflow_rate_proposal_policies")
        .selectAll()
        .where("branch_id", "=", branchId)
        .executeTakeFirst();

      return row ? toRateProposalPolicyDefault(row) : undefined;
    },

    upsert(values: RateProposalPolicyDefault): Promise<unknown> {
      const row = {
        branch_id: values.branchId,
        validity_days: values.validityDays,
        updated_at: values.updatedAt,
        updated_by_user_id: values.updatedByUserId,
      } satisfies NewRateProposalPolicyRow;

      return db
        .insertInto("workflow_rate_proposal_policies")
        .values(row)
        .onConflict((oc) =>
          oc.column("branch_id").doUpdateSet({
            validity_days: row.validity_days,
            updated_at: row.updated_at,
            updated_by_user_id: row.updated_by_user_id,
          }),
        )
        .execute();
    },
  };
}
