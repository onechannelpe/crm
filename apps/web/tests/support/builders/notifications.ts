import type { Insertable } from "kysely";

import type {
  NotificationDeliveriesTable,
  NotificationIntentsTable,
} from "~/lib/db/types";
import type {
  NotificationAudience,
  NotificationChannel,
} from "~/server/notifications/types";
import { NotificationIntentId, UserId } from "~/server/shared/ids";

type IntentRow = Insertable<NotificationIntentsTable>;
type DeliveryRow = Insertable<NotificationDeliveriesTable>;

const DEFAULT_NOW = new Date(1_700_000_000_000);
const DEFAULT_USER_ID = UserId.trust("notification-builder-user");

// Intent row with sane defaults. `audience_json`/`channels_json` are
// stringified here, matching `enqueueNotifications`. `pg` auto-serializes plain
// objects for jsonb params but not arrays, so an un-stringified array comes out
// as a Postgres array literal and fails jsonb validation.
export function anIntentRow(
  overrides: {
    id: string;
    audience?: NotificationAudience;
    channels?: NotificationChannel[];
    now?: Date;
  } & Partial<IntentRow>,
): IntentRow {
  const {
    audience = { kind: "user_ids", userIds: [DEFAULT_USER_ID] },
    channels = ["in_app"],
    now = DEFAULT_NOW,
    ...rest
  } = overrides;

  return {
    event_type: "test.event",
    audience_json: JSON.stringify(audience),
    channels_json: JSON.stringify(channels),
    title: "Test",
    body_text: "Body",
    action_url: null,
    priority: "normal",
    queue_state: "pending",
    attempt_count: 0,
    max_attempts: 5,
    available_at: now,
    lease_owner: null,
    lease_until: null,
    error: null,
    created_at: now,
    expanded_at: null,
    ...rest,
  };
}

// Delivery work row with sane defaults, for tests that need to seed a specific
// lifecycle state (e.g. an attempt_count near the ceiling) without going
// through expansion.
export function aDeliveryRow(
  overrides: {
    intent_id: NotificationIntentId;
    user_id?: UserId;
    now?: Date;
  } & Partial<DeliveryRow>,
): DeliveryRow {
  const { now = DEFAULT_NOW, ...rest } = overrides;

  return {
    user_id: DEFAULT_USER_ID,
    channel: "email",
    recipient_address: "user@test.local",
    title: "Test",
    body_text: "Body",
    action_url: null,
    queue_state: "pending",
    attempt_count: 0,
    max_attempts: 5,
    available_at: now,
    lease_owner: null,
    lease_until: null,
    provider: null,
    provider_message_id: null,
    error_code: null,
    error_message: null,
    created_at: now,
    sent_at: null,
    ...rest,
  };
}

export function notificationIntentId(value: string): NotificationIntentId {
  return NotificationIntentId.trust(value);
}
