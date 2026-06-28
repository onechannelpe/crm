import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";

// The shape the expansion stage needs: queue lease fields plus the content it
// fans out into in-app rows and delivery rows.
export interface IntentJob {
  id: string;
  attempt_count: number;
  max_attempts: number;
  event_type: string;
  audience_json: string;
  channels_json: string;
  priority: "high" | "normal" | "low";
  title: string;
  body_text: string;
  action_url: string | null;
}

export interface IntentRepository {
  claimPending(
    workerId: string,
    now: number,
    limit: number,
    leaseMs: number,
  ): Promise<IntentJob[]>;
  extendLease(
    id: string,
    workerId: string,
    leaseMs: number,
    now: number,
  ): Promise<boolean>;
  markExpanded(id: string, now: number): Promise<void>;
  scheduleRetry(id: string, availableAt: number): Promise<void>;
  markFailed(id: string, reason: string, now: number): Promise<void>;
  countOutstanding(): Promise<number>;
}

export function createIntentRepository(db: Kysely<Database>): IntentRepository {
  return {
    async claimPending(workerId, now, limit, leaseMs) {
      const candidates = await db
        .selectFrom("notification_outbox")
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
        .updateTable("notification_outbox")
        .set((eb) => ({
          status: "expanding",
          lease_owner: workerId,
          lease_until: now + leaseMs,
          attempt_count: eb("attempt_count", "+", 1),
        }))
        .where("id", "in", ids)
        .where("status", "=", "pending")
        .execute();

      return db
        .selectFrom("notification_outbox")
        .select([
          "id",
          "attempt_count",
          "max_attempts",
          "event_type",
          "audience_json",
          "channels_json",
          "priority",
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
        .updateTable("notification_outbox")
        .set({ lease_until: now + leaseMs })
        .where("id", "=", id)
        .where("lease_owner", "=", workerId)
        .where("status", "=", "expanding")
        .executeTakeFirst();
      return Number(result.numUpdatedRows ?? 0) > 0;
    },

    async markExpanded(id, now) {
      await db
        .updateTable("notification_outbox")
        .set({
          status: "expanded",
          expanded_at: now,
          lease_owner: null,
          lease_until: null,
          error: null,
        })
        .where("id", "=", id)
        .execute();
    },

    async scheduleRetry(id, availableAt) {
      await db
        .updateTable("notification_outbox")
        .set({
          status: "pending",
          available_at: availableAt,
          lease_owner: null,
          lease_until: null,
        })
        .where("id", "=", id)
        .execute();
    },

    async markFailed(id, reason, now) {
      await db
        .updateTable("notification_outbox")
        .set({
          status: "failed",
          expanded_at: now,
          lease_owner: null,
          lease_until: null,
          error: reason,
        })
        .where("id", "=", id)
        .execute();
    },

    async countOutstanding() {
      const row = await db
        .selectFrom("notification_outbox")
        .select((eb) => eb.fn.count<number>("id").as("count"))
        .where("status", "in", ["pending", "expanding"])
        .executeTakeFirstOrThrow();
      return row.count;
    },
  };
}
