import type { DatabaseExecutor } from "~/server/shared/db-executor";

import { validateNotificationIntent } from "./outbox-payload";
import type { NotificationIntent } from "./types";

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
        status: "pending" as const,
        attempt_count: 0,
        available_at: now,
        lease_owner: null,
        lease_until: null,
        error: null,
        created_at: now,
        processed_at: null,
      })),
    )
    .onConflict((oc) => oc.column("id").doNothing())
    .execute();
}
