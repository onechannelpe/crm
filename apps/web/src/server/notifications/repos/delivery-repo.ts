import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";

export type DeliveryChannel = "email" | "whatsapp";
export type DeliveryProviderId = "resend" | "whatsapp_cloud" | "kapso";

// One concrete external send, written by the expansion stage.
export interface PlannedDeliveryRow {
  intent_id: string;
  user_id: number;
  channel: DeliveryChannel;
  recipient_address: string;
  title: string;
  body_text: string;
  action_url: string | null;
}

// The shape the dispatch stage needs to perform a send.
export interface DeliveryJob {
  id: number;
  attempt_count: number;
  max_attempts: number;
  intent_id: string;
  user_id: number;
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
  insertPlanned(rows: PlannedDeliveryRow[], now: number): Promise<void>;
  claimPending(
    workerId: string,
    now: number,
    limit: number,
    leaseMs: number,
  ): Promise<DeliveryJob[]>;
  extendLease(
    id: number,
    workerId: string,
    leaseMs: number,
    now: number,
  ): Promise<boolean>;
  recordAttempt(id: number, attempt: DeliveryAttempt): Promise<void>;
  markSent(id: number, now: number): Promise<void>;
  scheduleRetry(id: number, availableAt: number): Promise<void>;
  markFailed(id: number): Promise<void>;
  countOutstanding(): Promise<number>;
}

export function createDeliveryRepository(
  db: Kysely<Database>,
): DeliveryRepository {
  return {
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
            status: "pending" as const,
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

    async claimPending(workerId, now, limit, leaseMs) {
      const candidates = await db
        .selectFrom("notification_deliveries")
        .select("id")
        .where("status", "=", "pending")
        .where("available_at", "<=", now)
        .where((eb) =>
          eb.or([eb("lease_until", "is", null), eb("lease_until", "<", now)]),
        )
        .orderBy("created_at", "asc")
        .limit(limit)
        .execute();
      if (candidates.length === 0) return [];

      const ids = candidates.map(({ id }) => id);
      await db
        .updateTable("notification_deliveries")
        .set((eb) => ({
          status: "sending",
          lease_owner: workerId,
          lease_until: now + leaseMs,
          attempt_count: eb("attempt_count", "+", 1),
        }))
        .where("id", "in", ids)
        .where("status", "=", "pending")
        .execute();

      return db
        .selectFrom("notification_deliveries")
        .select([
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
        ])
        .where("id", "in", ids)
        .where("lease_owner", "=", workerId)
        .execute();
    },

    async extendLease(id, workerId, leaseMs, now) {
      const result = await db
        .updateTable("notification_deliveries")
        .set({ lease_until: now + leaseMs })
        .where("id", "=", id)
        .where("lease_owner", "=", workerId)
        .where("status", "=", "sending")
        .executeTakeFirst();
      return Number(result.numUpdatedRows ?? 0) > 0;
    },

    // The send outcome (provider id, message id, error) is the dispatch stage's
    // to record; the lifecycle status below is the queue's. Splitting the writes
    // keeps each owner's columns clear.
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

    async markSent(id, now) {
      await db
        .updateTable("notification_deliveries")
        .set({
          status: "sent",
          sent_at: now,
          lease_owner: null,
          lease_until: null,
        })
        .where("id", "=", id)
        .execute();
    },

    async scheduleRetry(id, availableAt) {
      await db
        .updateTable("notification_deliveries")
        .set({
          status: "pending",
          available_at: availableAt,
          lease_owner: null,
          lease_until: null,
        })
        .where("id", "=", id)
        .execute();
    },

    async markFailed(id) {
      await db
        .updateTable("notification_deliveries")
        .set({
          status: "failed",
          lease_owner: null,
          lease_until: null,
        })
        .where("id", "=", id)
        .execute();
    },

    async countOutstanding() {
      const row = await db
        .selectFrom("notification_deliveries")
        .select((eb) => eb.fn.count<number>("id").as("count"))
        .where("status", "in", ["pending", "sending"])
        .executeTakeFirstOrThrow();
      return row.count;
    },
  };
}
