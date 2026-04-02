import type { Insertable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { LeadAssignmentDraft } from "~/server/pipeline/application/ports";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

type NewAssignmentRow = Insertable<Database["pipeline_lead_assignments"]>;

export function createAssignmentRepo(db: DatabaseExecutor) {
  return {
    async insert(values: LeadAssignmentDraft): Promise<number> {
      const result = await db
        .insertInto("pipeline_lead_assignments")
        .values({
          lead_id: values.leadId,
          executive_id: values.executiveId,
          assigned_by: values.assignedBy,
          is_active: values.isActive,
          assigned_at: values.assignedAt,
        } satisfies NewAssignmentRow)
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
  };
}
