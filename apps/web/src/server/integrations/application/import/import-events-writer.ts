import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createEventsRepo } from "~/server/shared/repos-events";
import { toLeadEventAppend } from "~/server/workflow/application/lead-events";
import {
  createHistoryEvent,
  type LeadHistoryEventDraft,
} from "~/server/workflow/domain/history";

import type { LeadMutationOutcome } from "./types";

function buildImportEvents(input: {
  actorId: number;
  mutation: LeadMutationOutcome;
}): LeadHistoryEventDraft[] {
  const { actorId, mutation } = input;
  const row = mutation.row;

  const primary =
    row.type === "import_status"
      ? createHistoryEvent({
          leadId: mutation.leadId,
          eventType: "lead_status_updated",
          actorUserId: actorId,
          payload: {
            fromStatus: mutation.previousStatus,
            toStatus: row.status,
            reason: "Imported from CSV",
          },
          occurredAt: mutation.changedAt,
        })
      : createHistoryEvent({
          leadId: mutation.leadId,
          eventType: "lead_priority_updated",
          actorUserId: actorId,
          payload: {
            fromPrioridad: mutation.previousPrioridad,
            toPrioridad: row.prioridad,
            reason: "Imported from CSV",
          },
          occurredAt: mutation.changedAt,
        });

  if (!mutation.stageChanged) {
    return [primary];
  }

  if (mutation.nextStatus === null || mutation.nextPrioridad === null) {
    throw new Error("Stage transition requires status and prioridad");
  }

  const reviewed = createHistoryEvent({
    leadId: mutation.leadId,
    eventType: "lead_reviewed",
    actorUserId: actorId,
    payload: {
      status: mutation.nextStatus,
      prioridad: mutation.nextPrioridad,
      reason: "Imported from CSV",
      fromStage: mutation.previousStage,
      toStage: mutation.nextStage,
    },
    occurredAt: mutation.changedAt,
  });

  const stageChanged = createHistoryEvent({
    leadId: mutation.leadId,
    eventType: "workflow_stage_changed",
    actorUserId: actorId,
    payload: {
      from: mutation.previousStage,
      to: mutation.nextStage,
    },
    occurredAt: mutation.changedAt,
  });

  return [primary, reviewed, stageChanged];
}

export async function appendImportLeadEvents(input: {
  executor: DatabaseExecutor;
  actorId: number;
  mutation: LeadMutationOutcome;
}): Promise<void> {
  const events = buildImportEvents({
    actorId: input.actorId,
    mutation: input.mutation,
  });

  await createEventsRepo(input.executor).append(events.map(toLeadEventAppend));
}
