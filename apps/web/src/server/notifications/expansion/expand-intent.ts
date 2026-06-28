import type { Logger } from "~/lib/observability/logger-shared";

import {
  parseNotificationAudience,
  parseNotificationChannels,
} from "../intent/payload";
import type { AppNotificationRepo } from "../repos/app-notification";
import type { DeliveryRepository } from "../repos/delivery-repo";
import type { IntentJob } from "../repos/intent-repo";
import type { RecipientPlanner } from "./plan-recipients";

// An intent either expands (write in-app rows + delivery rows) or is terminally
// invalid (malformed payload). Transient failures, e.g. a DB error, throw and
// are retried by the queue; classification of those is the queue's job.
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
    now: number,
  ): Promise<ExpansionOutcome> {
    // Parse failures are terminal: retrying a malformed payload only repeats the
    // same rejection. Resolve them here before any write.
    let audience;
    let channels;
    try {
      audience = parseNotificationAudience(job.audience_json);
      channels = parseNotificationChannels(job.channels_json);
    } catch (error) {
      return { kind: "invalid", reason: String(error) };
    }

    const plan = await deps.planRecipients({ audience, channels }, now);

    // In-app delivery is a local, idempotent insert with no provider or rate
    // limit, so it is written here rather than queued as a dispatch job.
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
