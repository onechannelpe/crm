import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import { createJobStore } from "~/lib/job-queue/job-store";

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
  const store = createJobStore<IntentJob, string>(db, "notification_outbox", [
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
  ]);

  return {
    claimPending: (workerId, now, limit, leaseMs) =>
      store.claimPending(workerId, now, limit, leaseMs),
    extendLease: (id, workerId, leaseMs, now) =>
      store.extendLease(id, workerId, leaseMs, now),
    scheduleRetry: (id, availableAt) => store.scheduleRetry(id, availableAt),
    // `expanded` is the intent's domain word for "done"; `expanded_at` doubles as
    // the finished-at marker on both the success and failure transitions.
    markExpanded: (id, now) =>
      store.markDone(id, { expanded_at: now, error: null }),
    markFailed: (id, reason, now) =>
      store.markFailed(id, { expanded_at: now, error: reason }),

    async countOutstanding() {
      const row = await db
        .selectFrom("notification_outbox")
        .select((eb) => eb.fn.count<number>("id").as("count"))
        .where("queue_state", "in", ["pending", "processing"])
        .executeTakeFirstOrThrow();
      return row.count;
    },
  };
}
