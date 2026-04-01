import type { DatabaseExecutor } from "~/server/shared/db-executor";

export function createLeadHistoryRepo(db: DatabaseExecutor) {
  return {
    listAssignments(leadId: number) {
      return db
        .selectFrom("pipeline_lead_assignments as assignment")
        .leftJoin(
          "users as executive",
          "executive.id",
          "assignment.executive_id",
        )
        .leftJoin("users as actor", "actor.id", "assignment.assigned_by")
        .select([
          "assignment.id",
          "assignment.lead_id",
          "assignment.executive_id",
          "assignment.assigned_by",
          "assignment.is_active",
          "assignment.assigned_at",
          "executive.names as executive_names",
          "executive.first_surname as executive_first_surname",
          "executive.second_surname as executive_second_surname",
          "actor.names as actor_names",
          "actor.first_surname as actor_first_surname",
          "actor.second_surname as actor_second_surname",
        ])
        .where("assignment.lead_id", "=", leadId)
        .orderBy("assignment.assigned_at", "desc")
        .execute();
    },

    listAuditEvents(leadId: number) {
      return db
        .selectFrom("audit_logs as audit")
        .leftJoin("users as actor", "actor.id", "audit.user_id")
        .select([
          "audit.id",
          "audit.user_id",
          "audit.action",
          "audit.entity_type",
          "audit.entity_id",
          "audit.changes",
          "audit.created_at",
          "actor.names as actor_names",
          "actor.first_surname as actor_first_surname",
          "actor.second_surname as actor_second_surname",
        ])
        .where("audit.entity_type", "=", "lead")
        .where("audit.entity_id", "=", leadId)
        .orderBy("audit.created_at", "desc")
        .execute();
    },
  };
}
