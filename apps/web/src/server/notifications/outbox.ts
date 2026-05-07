import type { DatabaseExecutor } from "~/server/shared/db-executor";

import type { NotificationIntent } from "./types";

export async function enqueueNotifications(
  db: DatabaseExecutor,
  intents: NotificationIntent[],
  now: number,
): Promise<void> {
  if (intents.length === 0) return;
  await db
    .insertInto("notification_outbox")
    .values(
      intents.map((intent) => ({
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
