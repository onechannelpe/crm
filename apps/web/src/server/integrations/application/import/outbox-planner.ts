import { projectLeadStageChangedEvent } from "~/server/notifications/unified";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import type { LeadMutationOutcome, PlannedOutboxEvents } from "./types";

export function createEmptyOutboxPlan(): PlannedOutboxEvents {
  return {
    domainEvents: [],
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

  if (mutation.executiveId <= 0) {
    return;
  }

  let branchId: number | null = null;
  if (mutation.nextStage === "READY_FOR_QUOTATION") {
    const user = await input.executor
      .selectFrom("users")
      .select("branch_id")
      .where("id", "=", mutation.executiveId)
      .executeTakeFirst();
    if (!user || user.branch_id <= 0) {
      return;
    }
    branchId = user.branch_id;
  }

  input.outboxPlan.domainEvents.push({
    id: `${mutation.row.type}:${mutation.row.row}:${mutation.leadId}:stage_changed`,
    leadId: mutation.leadId,
    toStage: mutation.nextStage,
    ruc: mutation.ruc,
    executiveId: mutation.executiveId,
    branchId,
  });
}

export async function persistOutboxPlan(input: {
  executor: DatabaseExecutor;
  outboxPlan: PlannedOutboxEvents;
  now: number;
}) {
  for (const event of input.outboxPlan.domainEvents) {
    await projectLeadStageChangedEvent(input.executor, {
      id: event.id,
      leadId: event.leadId,
      toStage: event.toStage,
      ruc: event.ruc,
      executiveId: event.executiveId,
      branchId: event.branchId,
      occurredAt: input.now,
    });
  }
}
