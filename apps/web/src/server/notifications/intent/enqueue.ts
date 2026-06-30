import type { DatabaseExecutor } from "~/server/shared/db-executor";

import type { NotificationIntent } from "../types";
import { validateNotificationIntent } from "./payload";

const DEFAULT_MAX_ATTEMPTS = 5;

// Stage 0: write intent rows transactionally with the business action. The
// fan-out to recipients happens later in the expansion stage, so this stays
// O(1) per intent regardless of audience size.
export async function enqueueNotifications(
  db: DatabaseExecutor,
  intents: readonly unknown[],
  now: number,
): Promise<void> {
  if (intents.length === 0) return;
  // `intents` is typed as `unknown` so the validation step is visible at this
  // boundary. Typed callers can pass a `NotificationIntent[]` directly.
  const validated: NotificationIntent[] = intents.map((intent) =>
    validateNotificationIntent(intent),
  );
  await db
    .insertInto("notification_outbox")
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
}
