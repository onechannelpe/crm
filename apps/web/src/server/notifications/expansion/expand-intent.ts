import type { Logger } from "~/lib/observability/logger-shared";
import { isErr } from "~/server/shared/result";

import type { AppNotificationRepo } from "../repos/app-notification";
import type { DeliveryRepository } from "../repos/delivery-repo";
import type { IntentJob } from "../repos/intent-repo";
import {
  projectIntentForPlanning,
  type RecipientPlanner,
} from "./plan-recipients";

// Transient failures (e.g. DB error) throw and are retried by the queue;
// classification is the queue's job. This function only resolves
// expand vs terminally invalid.
export type ExpansionOutcome =
  | { kind: "expanded"; deliveriesPlanned: number }
  | { kind: "invalid"; reason: string };

export function createIntentExpander(deps: {
  planRecipients: RecipientPlanner;
  appNotifications: Pick<AppNotificationRepo, "createMany">;
  deliveries: Pick<DeliveryRepository, "insertPlanned">;
  logger: Pick<Logger, "info">;
}) {
  return async function expandIntent(
    job: IntentJob,
    now: Date,
  ): Promise<ExpansionOutcome> {
    const planningInput = projectIntentForPlanning(job);
    if (isErr(planningInput)) {
      return { kind: "invalid", reason: planningInput.error };
    }

    const plan = await deps.planRecipients(planningInput.value, now);

    // In-app delivery is a local idempotent insert with no provider or rate
    // limit: not queued as a dispatch job.
    await deps.appNotifications.createMany(
      plan.inAppRecipients.map((userId) => ({
        user_id: userId,
        source_event_id: job.id,
        event_type: job.event_type,
        priority: job.priority,
        title: job.title,
        body_text: job.body_text,
        action_url: job.action_url,
        metadata_json: null,
        created_at: now,
        read_at: null,
      })),
    );

    await deps.deliveries.insertPlanned(
      plan.externalDeliveries.map((delivery) => ({
        intent_id: job.id,
        user_id: delivery.userId,
        channel: delivery.channel,
        recipient_address: delivery.recipientAddress,
        title: job.title,
        body_text: job.body_text,
        action_url: job.action_url,
      })),
      now,
    );

    deps.logger.info("intent_expanded", {
      id: job.id,
      event_type: job.event_type,
      in_app: plan.inAppRecipients.length,
      external: plan.externalDeliveries.length,
    });

    return {
      kind: "expanded",
      deliveriesPlanned: plan.externalDeliveries.length,
    };
  };
}

export type IntentExpander = ReturnType<typeof createIntentExpander>;
