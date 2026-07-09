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

// One concrete external send, written by the expansion stage.
export interface PlannedDeliveryRow {
  intent_id: NotificationIntentId;
  user_id: UserId;
  channel: DeliveryChannel;
  recipient_address: string;
  title: string;
  body_text: string;
  action_url: string | null;
}

// The shape the dispatch stage needs to perform a send.
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

export interface DeliveryAttempt {
  provider: DeliveryProviderId | null;
  provider_message_id: string | null;
  error_code: string | null;
  error_message: string | null;
  latency_ms: number | null;
}

const DEFAULT_MAX_ATTEMPTS = 5;

export interface DeliveryRepository {
  store: JobStore<NotificationDeliveryId, DeliveryJob>;
  insertPlanned(rows: PlannedDeliveryRow[], now: Date): Promise<void>;
  recordAttempt(
    id: NotificationDeliveryId,
    attempt: DeliveryAttempt,
  ): Promise<void>;
  countOutstanding(): Promise<number>;
}

export function createDeliveryRepository(
  db: Kysely<Database>,
): DeliveryRepository {
  // `sent_at` is the finished-at stamp; the provider error is recorded
  // separately via recordAttempt, so the queue lifecycle needs no error column.
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
            latency_ms: null,
            created_at: now,
            sent_at: null,
          })),
        )
        .onConflict((oc) =>
          oc.columns(["intent_id", "user_id", "channel"]).doNothing(),
        )
        .execute();
    },

    // The send outcome (provider id, message id, error) is the dispatch stage's
    // to record; the queue lifecycle is the store's. Splitting the writes keeps
    // each owner's columns clear.
    async recordAttempt(id, attempt) {
      await db
        .updateTable("notification_deliveries")
        .set({
          provider: attempt.provider,
          provider_message_id: attempt.provider_message_id,
          error_code: attempt.error_code,
          error_message: attempt.error_message,
          latency_ms: attempt.latency_ms,
        })
        .where("id", "=", id)
        .execute();
    },

    async countOutstanding() {
      const row = await db
        .selectFrom("notification_deliveries")
        .select((eb) => eb.fn.count<number>("id").as("count"))
        .where("queue_state", "in", ["pending", "processing"])
        .executeTakeFirstOrThrow();
      return row.count;
    },
  };
}
