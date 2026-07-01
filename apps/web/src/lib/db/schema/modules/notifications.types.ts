import type { Generated } from "kysely";

import type { Json } from "~/contracts/json";
import type {
  AppNotificationId,
  EventId,
  GeneratedId,
  IdColumn,
  NotificationDeliveryId,
  NotificationIntentId,
  UserId,
} from "~/server/shared/ids";

export interface UserChannelAddressesTable {
  id: Generated<string>;
  user_id: IdColumn<UserId>;
  channel: "email" | "whatsapp";
  address: string;
  is_verified: boolean;
  verified_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface WhatsAppSessionsTable {
  id: Generated<string>;
  user_id: IdColumn<UserId>;
  expires_at: Date;
}

export interface NotificationPreferencesTable {
  id: Generated<string>;
  user_id: IdColumn<UserId>;
  event_type: string;
  channel: "email" | "whatsapp";
  is_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

// A delivery is one external send to one recipient on one channel: the unit of
// work for the dispatch stage. It is leased, retried, and idempotent on
// (intent_id, user_id, channel). Message content (title/body/action_url) is
// snapshotted at expansion so dispatch never reads the intent table.
export interface NotificationDeliveriesTable {
  id: GeneratedId<NotificationDeliveryId>;
  intent_id: IdColumn<NotificationIntentId>;
  user_id: IdColumn<UserId>;
  channel: "email" | "whatsapp";
  recipient_address: string;
  title: string;
  body_text: string;
  action_url: string | null;
  queue_state: "pending" | "processing" | "done" | "failed";
  attempt_count: number;
  max_attempts: number;
  available_at: Date;
  lease_owner: string | null;
  lease_until: Date | null;
  provider: "resend" | "whatsapp_cloud" | "kapso" | null;
  provider_message_id: string | null;
  error_code: string | null;
  error_message: string | null;
  latency_ms: number | null;
  created_at: Date;
  sent_at: Date | null;
}

export interface AppNotificationsTable {
  id: GeneratedId<AppNotificationId>;
  user_id: IdColumn<UserId>;
  source_event_id: IdColumn<EventId>;
  event_type: string;
  priority: "high" | "normal" | "low";
  title: string;
  body_text: string;
  action_url: string | null;
  metadata_json: Json | null;
  created_at: Date;
  read_at: Date | null;
}

// An intent is a request to notify, written transactionally with the business
// action (Stage 0). The expansion stage leases it, fans it out into in-app rows
// and external delivery rows, then marks it expanded. audience_json/channels_json
// are jsonb validated at the expansion boundary, so they read back as `unknown`.
export interface NotificationOutboxTable {
  id: IdColumn<NotificationIntentId>;
  event_type: string;
  audience_json: Json;
  channels_json: Json;
  title: string;
  body_text: string;
  action_url: string | null;
  priority: "high" | "normal" | "low";
  queue_state: "pending" | "processing" | "done" | "failed";
  attempt_count: number;
  max_attempts: number;
  available_at: Date;
  lease_owner: string | null;
  lease_until: Date | null;
  error: string | null;
  created_at: Date;
  expanded_at: Date | null;
}
