import type { Generated } from "kysely";

import type { UsersTable } from "./02-crm";

export interface ActionObservationsTable {
  id: Generated<number>;
  trace_id: string;
  request_id: string;
  route_path: string | null;
  http_method: string | null;
  action_name: string;
  actor_user_id: number | null;
  actor_role: UsersTable["role"] | null;
  status: "ok" | "error";
  duration_ms: number;
  error_code: string | null;
  error_category:
    | "none"
    | "validation"
    | "authorization"
    | "conflict"
    | "not_found"
    | "rate_limit"
    | "internal";
  public_error: string | null;
  is_sensitive: number;
  input_summary: string | null;
  created_at: number;
}

export interface AgentStatusLogsTable {
  id: Generated<number>;
  user_id: number;
  status:
    | "available"
    | "feedback"
    | "break"
    | "services"
    | "training"
    | "unavailable";
  latitude: number;
  longitude: number;
  comment: string | null;
  started_at: number;
  ended_at: number | null;
}

export interface ActionRateLimitCountersTable {
  id: Generated<number>;
  key_hash: string;
  window_started_at: number;
  request_count: number;
  updated_at: number;
}

export interface AuthThrottleCountersTable {
  id: Generated<number>;
  scope: "ip" | "account" | "ip_account";
  key_hash: string;
  window_started_at: number;
  failure_count: number;
  blocked_until: number | null;
  updated_at: number;
}

export interface AuthEventsTable {
  id: Generated<number>;
  user_id: number | null;
  method: "password" | "passkey" | "totp";
  stage: "login" | "challenge" | "verify" | "recovery";
  outcome: "success" | "failure" | "throttled";
  reason: string | null;
  identifier_hash: string;
  ip_hash: string;
  created_at: number;
}

export type Db = {
  action_observations: ActionObservationsTable;
  agent_status_logs: AgentStatusLogsTable;
  action_rate_limit_counters: ActionRateLimitCountersTable;
  auth_throttle_counters: AuthThrottleCountersTable;
  auth_events: AuthEventsTable;
};
