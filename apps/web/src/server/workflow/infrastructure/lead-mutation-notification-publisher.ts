import { enqueueNotifications } from "~/server/notifications/outbox";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import { deriveLeadStageNotifications } from "../application/notification-policy";
import type { LeadMutationOutcome } from "../application/ports/lead";

export type PublishLeadMutationNotificationsInput = {
  leadId: string;
  ruc: string;
  executiveId: number;
  events: LeadMutationOutcome["events"];
  historyIds: string[];
  now: number;
};

export function createLeadMutationNotificationPublisher(
  executor: DatabaseExecutor,
) {
  async function resolveExecutiveBranchId(executiveId: number) {
    const row = await executor
      .selectFrom("users")
      .select("branch_id")
      .where("id", "=", executiveId)
      .executeTakeFirst();
    return row?.branch_id ?? null;
  }

  return async function publishLeadMutationNotifications(
    input: PublishLeadMutationNotificationsInput,
  ) {
    const branchId = await resolveExecutiveBranchId(input.executiveId);

    /* eslint-disable no-await-in-loop */
    for (let index = 0; index < input.events.history.length; index += 1) {
      const event = input.events.history[index];
      const eventId = input.historyIds[index];
      if (!eventId) continue;
      if (event.eventType !== "workflow_stage_changed") continue;

      const intents = deriveLeadStageNotifications({
        eventId,
        leadId: input.leadId,
        toStage: event.payload.to,
        ruc: input.ruc,
        executiveId: input.executiveId,
        branchId,
      });
      await enqueueNotifications(executor, intents, input.now);
    }
    /* eslint-enable no-await-in-loop */
  };
}
