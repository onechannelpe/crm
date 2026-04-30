import type { Generated } from "kysely";

export interface SearchCapacityGrantsTable {
  id: string;
  user_id: number;
  amount: number;
  reason: string;
  actor_user_id: number;
  created_at: number;
}

export interface SearchUsageReservationsTable {
  id: string;
  user_id: number;
  amount: number;
  status: "pending" | "committed" | "cancelled" | "expired";
  reason: string;
  created_at: number;
  updated_at: number;
}

export interface SearchUsageCommitsTable {
  id: string;
  reservation_id: string;
  amount: number;
  created_at: number;
}

export interface LeadCapacityGrantsTable {
  id: string;
  user_id: number;
  amount: number;
  reason: string;
  actor_user_id: number;
  created_at: number;
}

export interface LeadUsageReservationsTable {
  id: string;
  user_id: number;
  amount: number;
  status: "pending" | "committed" | "cancelled" | "expired";
  reason: string;
  created_at: number;
  updated_at: number;
}

export interface LeadUsageCommitsTable {
  id: string;
  reservation_id: string;
  amount: number;
  created_at: number;
}

export interface CapacityRequestsTable {
  id: Generated<number>;
  user_id: number;
  kind: "search_extra" | "lead_refill_extra";
  status: "pending" | "approved" | "rejected" | "canceled";
  requested_amount: number;
  reason: string;
  decision_note: string | null;
  reviewer_user_id: number | null;
  created_at: number;
  updated_at: number;
  decided_at: number | null;
}

export interface LeadPolicyDefaultsTable {
  id: Generated<number>;
  scope_type: "branch" | "team";
  scope_id: number;
  active_buffer_target: number;
  daily_refill_limit: number;
  created_at: number;
  updated_at: number;
}

export interface LeadPolicyOverridesTable {
  id: Generated<number>;
  user_id: number;
  active_buffer_target: number;
  daily_refill_limit: number;
  effective_from: number;
  expires_at: number | null;
  set_by_user_id: number;
  created_at: number;
}

export interface SearchPolicyDefaultsTable {
  id: Generated<number>;
  scope_type: "branch" | "team";
  scope_id: number;
  period_type: "month";
  search_limit: number;
  created_at: number;
  updated_at: number;
}

export interface SearchPolicyOverridesTable {
  id: Generated<number>;
  user_id: number;
  search_limit: number;
  effective_from: number;
  expires_at: number | null;
  set_by_user_id: number;
  created_at: number;
}
