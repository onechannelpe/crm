import type { Generated } from "kysely";

export interface UserChannelAddressesTable {
  id: Generated<number>;
  user_id: number;
  channel: "email" | "whatsapp";
  address: string;
  is_verified: number;
  verified_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface WhatsAppSessionsTable {
  id: Generated<number>;
  user_id: number;
  expires_at: number;
}

export interface NotificationPreferencesTable {
  id: Generated<number>;
  user_id: number;
  event_type: string;
  channel: "email" | "whatsapp";
  is_enabled: number;
  created_at: number;
  updated_at: number;
}

// A delivery is one external send to one recipient on one channel: the unit of
// work for the dispatch stage. It is leased, retried, and idempotent on
// (intent_id, user_id, channel). Message content (title/body/action_url) is
// snapshotted at expansion so dispatch never reads the intent table.
export interface NotificationDeliveriesTable {
  id: Generated<number>;
  intent_id: string;
  user_id: number;
  channel: "email" | "whatsapp";
  recipient_address: string;
  title: string;
  body_text: string;
  action_url: string | null;
  status: "pending" | "sending" | "sent" | "failed";
  attempt_count: number;
  max_attempts: number;
  available_at: number;
  lease_owner: string | null;
  lease_until: number | null;
  provider: "resend" | "whatsapp_cloud" | "kapso" | null;
  provider_message_id: string | null;
  error_code: string | null;
  error_message: string | null;
  latency_ms: number | null;
  created_at: number;
  sent_at: number | null;
}

export interface AppNotificationsTable {
  id: Generated<number>;
  user_id: number;
  source_event_id: string;
  event_type: string;
  priority: "high" | "normal" | "low";
  title: string;
  body_text: string;
  action_url: string | null;
  metadata_json: string | null;
  created_at: number;
  read_at: number | null;
}

// An intent is a request to notify, written transactionally with the business
// action (Stage 0). The expansion stage leases it, fans it out into in-app rows
// and external delivery rows, then marks it expanded.
export interface NotificationOutboxTable {
  id: string;
  event_type: string;
  audience_json: string;
  channels_json: string;
  title: string;
  body_text: string;
  action_url: string | null;
  priority: "high" | "normal" | "low";
  status: "pending" | "expanding" | "expanded" | "failed";
  attempt_count: number;
  max_attempts: number;
  available_at: number;
  lease_owner: string | null;
  lease_until: number | null;
  error: string | null;
  created_at: number;
  expanded_at: number | null;
}
