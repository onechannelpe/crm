import { enqueueNotifications } from "~/server/notifications/outbox";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { deriveLeadStageNotifications } from "~/server/workflow/effects/notify";

import type { LeadMutationOutcome, PlannedOutboxEvents } from "./types";

export function createEmptyOutboxPlan(): PlannedOutboxEvents {
  return { notificationIntents: [] };
}

export async function planOutboxForMutation(input: {
  executor: DatabaseExecutor;
  mutation: LeadMutationOutcome;
  outboxPlan: PlannedOutboxEvents;
}) {
  const mutation = input.mutation;
  if (!mutation.stageChanged || mutation.executiveId <= 0) return;

  let branchId: number | null = null;
  if (mutation.nextStage === "PRICING") {
    const user = await input.executor
      .selectFrom("users")
      .select("branch_id")
      .where("id", "=", mutation.executiveId)
      .executeTakeFirst();
    if (!user || (user.branch_id ?? 0) <= 0) return;
    branchId = user.branch_id;
  }

  const eventId = `${mutation.row.type}:${mutation.row.row}:${mutation.leadId}:stage_changed`;
  const intents = deriveLeadStageNotifications({
    eventId,
    leadId: mutation.leadId,
    toStage: mutation.nextStage,
    ruc: mutation.ruc,
    executiveId: mutation.executiveId,
    branchId,
  });

  input.outboxPlan.notificationIntents.push(...intents);
}

export async function persistOutboxPlan(input: {
  executor: DatabaseExecutor;
  outboxPlan: PlannedOutboxEvents;
  now: number;
}) {
  await enqueueNotifications(
    input.executor,
    input.outboxPlan.notificationIntents,
    input.now,
  );
}
