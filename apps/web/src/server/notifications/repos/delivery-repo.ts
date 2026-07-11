import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import { createJobStore, type JobStore } from "~/lib/job-queue/job-store";
import type {
  NotificationDeliveryId,
  NotificationIntentId,
  UserId,
} from "~/server/shared/ids";

export type DeliveryChannel = "email" | "whatsapp";
export type DeliveryProviderId = "resend" | "whatsapp_cloud" | "kapso";

export interface PlannedDeliveryRow {
  intent_id: NotificationIntentId;
  user_id: UserId;
  channel: DeliveryChannel;
  recipient_address: string;
  title: string;
  body_text: string;
  action_url: string | null;
}

export interface DeliveryJob {
  id: NotificationDeliveryId;
  attempt_count: number;
  max_attempts: number;
  intent_id: NotificationIntentId;
  user_id: UserId;
  channel: DeliveryChannel;
  recipient_address: string;
  title: string;
  body_text: string;
  action_url: string | null;
}

const DEFAULT_MAX_ATTEMPTS = 5;

export interface DeliveryRepository {
  store: JobStore<NotificationDeliveryId, DeliveryJob>;
  insertPlanned(rows: PlannedDeliveryRow[], now: Date): Promise<void>;
}

export function createDeliveryRepository(
  db: Kysely<Database>,
): DeliveryRepository {
  // sent_at is the only lifecycle mirror column; provider/message/error land
  // via the dispatch queue's settle patch (see dispatch/queue.ts), in the
  // same lease-guarded statement as the queue_state transition.
  const store = createJobStore<DeliveryJob, NotificationDeliveryId>(
    db,
    "notification_deliveries",
    [
      "id",
      "attempt_count",
      "max_attempts",
      "intent_id",
      "user_id",
      "channel",
      "recipient_address",
      "title",
      "body_text",
      "action_url",
    ],
  );

  return {
    store,
    async insertPlanned(rows, now) {
      if (rows.length === 0) return;
      await db
        .insertInto("notification_deliveries")
        .values(
          rows.map((row) => ({
            intent_id: row.intent_id,
            user_id: row.user_id,
            channel: row.channel,
            recipient_address: row.recipient_address,
            title: row.title,
            body_text: row.body_text,
            action_url: row.action_url,
            queue_state: "pending" as const,
            attempt_count: 0,
            max_attempts: DEFAULT_MAX_ATTEMPTS,
            available_at: now,
            lease_owner: null,
            lease_until: null,
            provider: null,
            provider_message_id: null,
            error_code: null,
            error_message: null,
            created_at: now,
            sent_at: null,
          })),
        )
        .onConflict((oc) =>
          oc.columns(["intent_id", "user_id", "channel"]).doNothing(),
        )
        .execute();
    },
  };
}
