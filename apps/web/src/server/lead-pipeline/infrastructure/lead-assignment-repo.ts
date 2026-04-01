import type { Insertable, Selectable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

export type LeadAssignmentRow = Selectable<
  Database["pipeline_lead_assignments"]
>;
export type NewLeadAssignmentRow = Insertable<
  Database["pipeline_lead_assignments"]
>;

export function createLeadAssignmentRepo(db: DatabaseExecutor) {
  return {
    async insert(values: NewLeadAssignmentRow): Promise<number> {
      const result = await db
        .insertInto("pipeline_lead_assignments")
        .values(values)
        .executeTakeFirstOrThrow();
      return Number(result.insertId);
    },

    deactivateActiveForLead(leadId: number) {
      return db
        .updateTable("pipeline_lead_assignments")
        .set({ is_active: 0 })
        .where("lead_id", "=", leadId)
        .where("is_active", "=", 1)
        .execute();
    },

    findActiveByLead(leadId: number) {
      return db
        .selectFrom("pipeline_lead_assignments")
        .selectAll()
        .where("lead_id", "=", leadId)
        .where("is_active", "=", 1)
        .executeTakeFirst();
    },

    listByLead(leadId: number) {
      return db
        .selectFrom("pipeline_lead_assignments")
        .selectAll()
        .where("lead_id", "=", leadId)
        .orderBy("assigned_at", "desc")
        .execute();
    },
  };
}
