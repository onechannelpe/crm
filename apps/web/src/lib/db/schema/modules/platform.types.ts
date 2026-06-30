import type {
  EventId,
  IdColumn,
  NullableIdColumn,
  UserId,
} from "~/server/shared/ids";

export interface EventsTable {
  id: IdColumn<EventId>;
  entity_type: string;
  entity_id: string;
  type: string;
  actor_user_id: NullableIdColumn<UserId>;
  subject_user_id: NullableIdColumn<UserId>;
  payload_json: unknown | null;
  changes_json: unknown | null;
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
