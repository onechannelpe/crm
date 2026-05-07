import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { enqueueWorkflowNotificationOutboxEvents } from "~/server/workflow/infrastructure/workflow-notification-outbox-repo";

import type { LeadMutationOutcome, PlannedOutboxEvents } from "./types";

export function createEmptyOutboxPlan(): PlannedOutboxEvents {
  return {
    notifications: [],
  };
}

export async function planOutboxForMutation(input: {
  executor: DatabaseExecutor;
  mutation: LeadMutationOutcome;
  outboxPlan: PlannedOutboxEvents;
}) {
  const mutation = input.mutation;
  if (!mutation.stageChanged) {
    return;
  }

  if (
    mutation.nextStage === "NEEDS_EXECUTIVE_INPUT" &&
    mutation.executiveId > 0
  ) {
    input.outboxPlan.notifications.push({
      sourceEventId: `${mutation.row.type}:${mutation.row.row}:${mutation.leadId}:needs_exec`,
      leadId: mutation.leadId,
      executiveId: mutation.executiveId,
      branchId: null,
      audienceKind: "executive",
      audienceRoles: [],
      eventType: "lead.needs_executive_input",
      title: "Accion requerida",
      bodyText: `El prospecto RUC ${mutation.ruc} requiere tu informacion comercial`,
      actionUrl: "/records",
      priority: "high",
    });
    return;
  }

  if (mutation.nextStage !== "READY_FOR_QUOTATION") {
    return;
  }

  const user = await input.executor
    .selectFrom("users")
    .select("branch_id")
    .where("id", "=", mutation.executiveId)
    .executeTakeFirst();
  if (!user || user.branch_id <= 0) {
    return;
  }

  input.outboxPlan.notifications.push({
    sourceEventId: `${mutation.row.type}:${mutation.row.row}:${mutation.leadId}:rfq`,
    leadId: mutation.leadId,
    executiveId: mutation.executiveId,
    branchId: user.branch_id,
    audienceKind: "branch_role",
    audienceRoles: ["back_office"],
    eventType: "lead.ready_for_quotation",
    title: "Prospecto listo para cotizacion",
    bodyText: `El prospecto RUC ${mutation.ruc} esta listo para cotizar`,
    actionUrl: `/records/${mutation.leadId}`,
    priority: "normal",
  });
}

export async function persistOutboxPlan(input: {
  executor: DatabaseExecutor;
  outboxPlan: PlannedOutboxEvents;
  now: number;
}) {
  await enqueueWorkflowNotificationOutboxEvents(
    input.executor,
    input.outboxPlan.notifications,
    input.now,
  );
}
