import { createHistoryEvent } from "~/server/pipeline/domain/history";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { UserId } from "~/server/shared/ids";

import type { LeadMutationOutcome } from "./types";

function serializePayload(payload: unknown): string | null {
  if (payload === null || payload === undefined) {
    return null;
  }
  return JSON.stringify(payload);
}

export async function writeHistoryAndAudit(input: {
  executor: DatabaseExecutor;
  actorId: UserId;
  mutation: LeadMutationOutcome;
}) {
  const mutation = input.mutation;
  const row = mutation.row;

  const primaryHistory = createHistoryEvent({
    leadId: mutation.leadId,
    eventType:
      row.type === "import_status"
        ? "lead_status_updated"
        : "lead_priority_updated",
    actorUserId: input.actorId,
    payload:
      row.type === "import_status"
        ? {
            fromStatus: mutation.previousStatus,
            toStatus: row.status,
            reason: "Imported from CSV",
          }
        : {
            fromPrioridad: mutation.previousPrioridad,
            toPrioridad: row.prioridad,
            reason: "Imported from CSV",
          },
    occurredAt: mutation.changedAt,
  });

  await input.executor
    .insertInto("pipeline_history_events")
    .values({
      lead_id: primaryHistory.leadId,
      event_type: primaryHistory.eventType,
      actor_user_id: primaryHistory.actorUserId,
      subject_user_id: primaryHistory.subjectUserId,
      payload_json: serializePayload(primaryHistory.payload),
      occurred_at: primaryHistory.occurredAt,
    })
    .execute();

  await input.executor
    .insertInto("audit_logs")
    .values({
      user_id: input.actorId,
      action:
        row.type === "import_status"
          ? "lead_status_imported"
          : "lead_priority_imported",
      entity_type: "lead",
      entity_id: mutation.leadId,
      changes: JSON.stringify({
        fromStatus: mutation.previousStatus,
        toStatus: mutation.nextStatus,
        fromPrioridad: mutation.previousPrioridad,
        toPrioridad: mutation.nextPrioridad,
        fromStage: mutation.previousStage,
        toStage: mutation.nextStage,
        reason: "Imported from CSV",
      }),
      created_at: mutation.changedAt,
    })
    .execute();

  if (!mutation.stageChanged) {
    return;
  }

  if (mutation.nextStatus === null || mutation.nextPrioridad === null) {
    throw new Error("Stage transition requires status and prioridad");
  }

  const reviewedHistory = createHistoryEvent({
    leadId: mutation.leadId,
    eventType: "lead_reviewed",
    actorUserId: input.actorId,
    payload: {
      status: mutation.nextStatus,
      prioridad: mutation.nextPrioridad,
      reason: "Imported from CSV",
      fromStage: mutation.previousStage,
      toStage: mutation.nextStage,
    },
    occurredAt: mutation.changedAt,
  });

  const stageHistory = createHistoryEvent({
    leadId: mutation.leadId,
    eventType: "workflow_stage_changed",
    actorUserId: input.actorId,
    payload: {
      from: mutation.previousStage,
      to: mutation.nextStage,
    },
    occurredAt: mutation.changedAt,
  });

  await input.executor
    .insertInto("pipeline_history_events")
    .values([
      {
        lead_id: reviewedHistory.leadId,
        event_type: reviewedHistory.eventType,
        actor_user_id: reviewedHistory.actorUserId,
        subject_user_id: reviewedHistory.subjectUserId,
        payload_json: serializePayload(reviewedHistory.payload),
        occurred_at: reviewedHistory.occurredAt,
      },
      {
        lead_id: stageHistory.leadId,
        event_type: stageHistory.eventType,
        actor_user_id: stageHistory.actorUserId,
        subject_user_id: stageHistory.subjectUserId,
        payload_json: serializePayload(stageHistory.payload),
        occurred_at: stageHistory.occurredAt,
      },
    ])
    .execute();

  await input.executor
    .insertInto("audit_logs")
    .values({
      user_id: input.actorId,
      action: "lead_reviewed",
      entity_type: "lead",
      entity_id: mutation.leadId,
      changes: JSON.stringify({
        fromStage: mutation.previousStage,
        toStage: mutation.nextStage,
        fromStatus: mutation.previousStatus,
        toStatus: mutation.nextStatus,
        fromPrioridad: mutation.previousPrioridad,
        toPrioridad: mutation.nextPrioridad,
        reason: "Imported from CSV",
      }),
      created_at: mutation.changedAt,
    })
    .execute();
}
