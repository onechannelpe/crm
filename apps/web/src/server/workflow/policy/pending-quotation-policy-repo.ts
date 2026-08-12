import type { Insertable, Selectable } from "kysely";

import type { BranchId, UserId } from "~/domain/ids";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import type { Database } from "~/server/platform/database/types";

type PendingQuotationPolicyRecord = {
  branchId: BranchId;
  clientLimit: number;
  updatedAt: Date;
  updatedByUserId: UserId;
};

export type PendingQuotationPolicyRepository = {
  findByBranchId(
    branchId: BranchId,
  ): Promise<PendingQuotationPolicyRecord | undefined>;
  upsert(values: PendingQuotationPolicyRecord): Promise<unknown>;
};

type PendingQuotationPolicyRow = Selectable<
  Database["workflow_pending_quotation_policies"]
>;

type NewPendingQuotationPolicyRow = Insertable<
  Database["workflow_pending_quotation_policies"]
>;

function toRecord(
  row: PendingQuotationPolicyRow,
): PendingQuotationPolicyRecord {
  return {
    branchId: row.branch_id,
    clientLimit: row.client_limit,
    updatedAt: row.updated_at,
    updatedByUserId: row.updated_by_user_id,
  };
}

export function createPendingQuotationPolicyRepo(
  db: DatabaseExecutor,
): PendingQuotationPolicyRepository {
  return {
    async findByBranchId(branchId: BranchId) {
      const row = await db
        .selectFrom("workflow_pending_quotation_policies")
        .selectAll()
        .where("branch_id", "=", branchId)
        .executeTakeFirst();

      return row ? toRecord(row) : undefined;
    },

    upsert(values: PendingQuotationPolicyRecord): Promise<unknown> {
      const row = {
        branch_id: values.branchId,
        client_limit: values.clientLimit,
        updated_at: values.updatedAt,
        updated_by_user_id: values.updatedByUserId,
      } satisfies NewPendingQuotationPolicyRow;

      return db
        .insertInto("workflow_pending_quotation_policies")
        .values(row)
        .onConflict((oc) =>
          oc.column("branch_id").doUpdateSet({
            client_limit: row.client_limit,
            updated_at: row.updated_at,
            updated_by_user_id: row.updated_by_user_id,
          }),
        )
        .execute();
    },
  };
}
