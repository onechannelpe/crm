import type { Logger } from "~/shared/observability/logger";
import { isErr } from "~/shared/result";

import type { AppNotificationRepo } from "../repos/app-notification";
import type { DeliveryRepository } from "../repos/delivery-repo";
import type { IntentJob } from "../repos/intent-repo";
import {
  projectIntentForPlanning,
  type RecipientPlanner,
} from "./plan-recipients";

// This function only resolves expand vs terminally invalid. Throws bubble to
// the queue, which decides retry vs fail.
type ExpansionOutcome =
  | { kind: "expanded" }
  | { kind: "invalid"; reason: string };

export function createIntentExpander(deps: {
  planRecipients: RecipientPlanner;
  appNotifications: Pick<AppNotificationRepo, "createMany">;
  deliveries: Pick<DeliveryRepository, "insertPlanned">;
  logger: Pick<Logger, "info">;
}) {
  return async function expandIntent(
    job: IntentJob,
    expandedAt: Date,
  ): Promise<ExpansionOutcome> {
    const planningInput = projectIntentForPlanning(job);
    if (isErr(planningInput)) {
      return { kind: "invalid", reason: planningInput.error };
    }

    const plan = await deps.planRecipients(planningInput.value, expandedAt);

    // In-app delivery is a local idempotent insert with no provider or rate
    // limit: not queued as a dispatch job.
    await deps.appNotifications.createMany(
      plan.inAppRecipients.map((userId) => ({
        user_id: userId,
        intent_id: job.id,
        event_type: job.event_type,
        priority: job.priority,
        title: job.title,
        body_text: job.body_text,
        action_url: job.action_url,
        metadata_json: null,
        created_at: expandedAt,
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
      expandedAt,
    );

    deps.logger.info("intent_expanded", {
      id: job.id,
      event_type: job.event_type,
      in_app: plan.inAppRecipients.length,
      external: plan.externalDeliveries.length,
    });

    return { kind: "expanded" };
  };
}

export type IntentExpander = ReturnType<typeof createIntentExpander>;
