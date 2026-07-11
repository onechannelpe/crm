import type { Generated } from "kysely";

import type { Json } from "~/contracts/json";
import type {
  AppNotificationId,
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

export interface NotificationOptOutsTable {
  id: Generated<string>;
  user_id: IdColumn<UserId>;
  category: string;
  channel: "email" | "whatsapp";
  created_at: Date;
}

// The unit of work for the dispatch stage. Leased, retried, idempotent on
// (intent_id, user_id, channel). Title/body/action_url are snapshotted at
// expansion so dispatch never reads the intent table.
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
  created_at: Date;
  sent_at: Date | null;
}

export interface AppNotificationsTable {
  id: GeneratedId<AppNotificationId>;
  user_id: IdColumn<UserId>;
  intent_id: IdColumn<NotificationIntentId>;
  event_type: string;
  priority: "high" | "normal" | "low";
  title: string;
  body_text: string;
  action_url: string | null;
  metadata_json: Json | null;
  created_at: Date;
  read_at: Date | null;
}

// Written transactionally with the business action (Stage 0); the expansion
// stage leases it, fans it out into in-app rows and external delivery rows,
// then marks it expanded. audience_json/channels_json are jsonb validated
// at the expansion boundary, so they read back as `unknown`.
export interface NotificationIntentsTable {
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
