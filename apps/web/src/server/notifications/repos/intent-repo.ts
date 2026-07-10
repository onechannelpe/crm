import type { Kysely } from "kysely";

import type { Json } from "~/contracts/json";
import type { Database } from "~/lib/db/types";
import { createJobStore, type JobStore } from "~/lib/job-queue/job-store";
import type { NotificationIntentId } from "~/server/shared/ids";

export interface IntentJob {
  id: NotificationIntentId;
  attempt_count: number;
  max_attempts: number;
  event_type: string;
  audience_json: Json;
  channels_json: Json;
  priority: "high" | "normal" | "low";
  title: string;
  body_text: string;
  action_url: string | null;
}

export interface IntentRepository {
  store: JobStore<NotificationIntentId, IntentJob>;
}

export function createIntentRepository(db: Kysely<Database>): IntentRepository {
  // expanded_at is the terminal marker for both success and failure; there is
  // no separate done_at. error carries the reason when the outcome is fail.
  const store = createJobStore<IntentJob, NotificationIntentId>(
    db,
    "notification_intents",
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
  );

  return { store };
}
