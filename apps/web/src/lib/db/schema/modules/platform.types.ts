export interface EventsTable {
  id: string;
  entity_type: string;
  entity_id: string;
  type: string;
  actor_user_id: number | null;
  subject_user_id: number | null;
  payload_json: string | null;
  changes_json: string | null;
  occurred_at: number;
}

export interface AuditActionPoliciesTable {
  action: string;
  risk_level: "high" | "medium" | "low";
  is_active: number;
  is_protected: number;
  updated_by_user_id: number | null;
  created_at: number;
  updated_at: number;
}
