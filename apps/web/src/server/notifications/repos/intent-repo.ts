import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import { createJobStore, type JobStore } from "~/lib/job-queue/job-store";

// The shape the expansion stage needs: queue lease fields plus the content it
// fans out into in-app rows and delivery rows.
export interface IntentJob {
  id: string;
  attempt_count: number;
  max_attempts: number;
  event_type: string;
  audience_json: unknown;
  channels_json: unknown;
  priority: "high" | "normal" | "low";
  title: string;
  body_text: string;
  action_url: string | null;
}

export interface IntentRepository {
  store: JobStore<string, IntentJob>;
  countOutstanding(): Promise<number>;
}

export function createIntentRepository(db: Kysely<Database>): IntentRepository {
  // `expanded` is the intent's word for "done"; `expanded_at` doubles as the
  // finished-at marker on both success and failure, and `error` carries the
  // reason on a terminal failure.
  const store = createJobStore<IntentJob, string>(
    db,
    "notification_outbox",
    [
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
    ],
    { finishedAt: "expanded_at", error: "error" },
  );

  return {
    store,

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
