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

export interface NotificationPreferencesTable {
  id: Generated<number>;
  user_id: number;
  event_type: string;
  channel: "email" | "whatsapp";
  is_enabled: number;
  created_at: number;
  updated_at: number;
}

export interface NotificationCampaignsTable {
  id: Generated<number>;
  type: "security_event" | "broadcast";
  event_type: string;
  audience_type: "user" | "role" | "global";
  audience_ref: string | null;
  title: string | null;
  body_text: string;
  created_by_user_id: number | null;
  status: "queued" | "processing" | "completed" | "failed";
  scheduled_at: number | null;
  created_at: number;
  processed_at: number | null;
}

export interface NotificationRecipientsTable {
  id: Generated<number>;
  campaign_id: number | null;
  intent_id: string | null;
  user_id: number | null;
  channel: "email" | "whatsapp";
  address: string;
  status: "pending" | "sent" | "failed" | "skipped";
  status_reason: string | null;
  created_at: number;
  sent_at: number | null;
  failed_at: number | null;
}

export interface NotificationJobsTable {
  id: Generated<number>;
  recipient_id: number;
  status: "pending" | "leased" | "sent" | "failed";
  attempt_count: number;
  max_attempts: number;
  available_at: number;
  lease_owner: string | null;
  lease_until: number | null;
  last_error: string | null;
  created_at: number;
  updated_at: number;
}

export interface NotificationDeliveriesTable {
  id: Generated<number>;
  recipient_id: number | null;
  intent_id: string | null;
  recipient_channel: "email" | "whatsapp" | null;
  recipient_address: string | null;
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
  intent_id: Generated<string | null>;
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

export interface DomainEventsTable {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  payload_json: string;
  occurred_at: number;
}

export interface NotificationIntentsOutboxTable {
  intent_id: string;
  source_event_id: string;
  event_type: string;
  aggregate_id: string;
  audience_kind: "user_ids" | "branch_roles" | "global_roles" | "team";
  audience_payload_json: string;
  channel_set_json: string;
  title: string;
  body_text: string;
  action_url: string | null;
  priority: "high" | "normal" | "low";
  status: "pending" | "processing" | "completed" | "failed";
  attempt_count: number;
  max_attempts: number;
  available_at: number;
  lease_owner: string | null;
  lease_until: number | null;
  error_message: string | null;
  created_at: number;
  processed_at: number | null;
}

export interface WorkflowNotificationOutboxTable {
  id: string;
  source_event_id: string;
  lead_id: string;
  executive_id: number;
  branch_id: number | null;
  event_type: string;
  priority: "high" | "normal" | "low";
  title: string;
  body_text: string;
  action_url: string | null;
  audience_kind: "executive" | "branch_role";
  audience_roles_csv: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  attempt_count: number;
  max_attempts: number;
  available_at: number;
  lease_owner: string | null;
  lease_until: number | null;
  error_message: string | null;
  created_at: number;
  processed_at: number | null;
}
