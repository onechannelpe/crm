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
  created_at: number;
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

export interface NotificationDeliveriesTable {
  id: Generated<number>;
  intent_id: string;
  recipient_channel: "email" | "whatsapp";
  recipient_address: string;
  provider: "resend" | "whatsapp_cloud";
  provider_message_id: string | null;
  status: "sent" | "failed";
  error_code: string | null;
  error_message: string | null;
  latency_ms: number | null;
  created_at: number;
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

export interface NotificationOutboxTable {
  id: string;
  event_type: string;
  audience_json: string;
  channels_json: string;
  title: string;
  body_text: string;
  action_url: string | null;
  priority: "high" | "normal" | "low";
  status: "pending" | "processing" | "done" | "failed";
  attempt_count: number;
  available_at: number;
  lease_owner: string | null;
  lease_until: number | null;
  error: string | null;
  created_at: number;
  processed_at: number | null;
}
