import { randomUUIDv7 } from "bun";
import type { Insertable, Selectable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { UserId, WorkflowLeadId } from "~/server/shared/ids";

export type LeadAssignmentDraft = {
  leadId: WorkflowLeadId;
  executiveId: UserId;
  assignedBy: UserId;
  isActive: boolean;
  assignedAt: Date;
};

export type LeadAssignment = LeadAssignmentDraft & {
  id: string;
};

export type LeadAssignmentRepository = {
  insert(values: LeadAssignmentDraft): Promise<string>;
  deactivateActiveForLead(leadId: WorkflowLeadId): Promise<unknown>;
  findActiveByLead(leadId: WorkflowLeadId): Promise<LeadAssignment | undefined>;
};

type AssignmentRow = Selectable<Database["workflow_lead_assignments"]>;
type NewAssignmentRow = Insertable<Database["workflow_lead_assignments"]>;

function toLeadAssignment(row: AssignmentRow): LeadAssignment {
  return {
    id: row.id,
    leadId: row.lead_id,
    executiveId: row.executive_id,
    assignedBy: row.assigned_by,
    isActive: row.is_active,
    assignedAt: row.assigned_at,
  };
}

export function createAssignmentRepo(db: DatabaseExecutor) {
  return {
    async insert(values: LeadAssignmentDraft): Promise<string> {
      const id = randomUUIDv7();
      await db
        .insertInto("workflow_lead_assignments")
        .values({
          id,
          lead_id: values.leadId,
          executive_id: values.executiveId,
          assigned_by: values.assignedBy,
          is_active: values.isActive,
          assigned_at: values.assignedAt,
        } satisfies NewAssignmentRow)
        .executeTakeFirstOrThrow();

      return id;
    },

    deactivateActiveForLead(leadId: WorkflowLeadId) {
      return db
        .updateTable("workflow_lead_assignments")
        .set({ is_active: false })
        .where("lead_id", "=", leadId)
        .where("is_active", "=", true)
        .execute();
    },

    async findActiveByLead(leadId: WorkflowLeadId) {
      const row = await db
        .selectFrom("workflow_lead_assignments")
        .selectAll()
        .where("lead_id", "=", leadId)
        .where("is_active", "=", true)
        .executeTakeFirst();

      return row ? toLeadAssignment(row) : undefined;
    },
  };
}
