import type { Json } from "~/contracts/json";
import type { EventId, IdColumn, NullableIdColumn, UserId } from "~/domain/ids";

export interface EventsTable {
  id: IdColumn<EventId>;
  entity_type: string;
  entity_id: string;
  type: string;
  actor_user_id: NullableIdColumn<UserId>;
  subject_user_id: NullableIdColumn<UserId>;
  payload_json: Json | null;
  changes_json: Json | null;
  occurred_at: Date;
}

export interface AuditActionPoliciesTable {
  action: string;
  risk_level: "high" | "medium" | "low";
  is_active: boolean;
  is_protected: boolean;
  updated_by_user_id: NullableIdColumn<UserId>;
  created_at: Date;
  updated_at: Date;
}
