import type { Kysely } from "kysely";

import type { Json } from "~/contracts/json";
import type { NotificationIntentId } from "~/domain/ids";
import type { Database } from "~/server/platform/database/types";
import {
  createJobStore,
  type JobStore,
} from "~/server/platform/jobs/job-store";

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
