import { notify } from "~/lib/db/notify";
import { JOB_TABLE_CHANNELS } from "~/lib/job-queue/registry";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import type { NotificationIntent } from "../types";
import { validateNotificationIntent } from "./payload";

const DEFAULT_MAX_ATTEMPTS = 5;

// O(1) per intent: writes one row in the business transaction; fan-out to
// recipients is the expansion stage's job.
export async function enqueueNotifications(
  db: DatabaseExecutor,
  intents: readonly unknown[],
  now: Date,
): Promise<void> {
  if (intents.length === 0) return;
  // `intents` is `unknown` so the validation step is visible at this boundary.
  // Typed callers can pass a `NotificationIntent[]` directly.
  const validated: NotificationIntent[] = intents.map((intent) =>
    validateNotificationIntent(intent),
  );
  await db
    .insertInto("notification_intents")
    .values(
      validated.map((intent) => ({
        id: intent.id,
        event_type: intent.eventType,
        audience_json: JSON.stringify(intent.audience),
        channels_json: JSON.stringify(intent.channels),
        title: intent.title,
        body_text: intent.bodyText,
        action_url: intent.actionUrl,
        priority: intent.priority,
        queue_state: "pending" as const,
        attempt_count: 0,
        max_attempts: DEFAULT_MAX_ATTEMPTS,
        available_at: now,
        lease_owner: null,
        lease_until: null,
        error: null,
        created_at: now,
        expanded_at: null,
      })),
    )
    .onConflict((oc) => oc.column("id").doNothing())
    .execute();

  // Wake the expansion stage on the same executor so a wrapping business
  // transaction buffers the NOTIFY until commit.
  notify(db, JOB_TABLE_CHANNELS.notification_intents);
}
