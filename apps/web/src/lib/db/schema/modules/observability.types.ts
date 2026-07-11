import type { Generated } from "kysely";

import type { IdColumn, NullableIdColumn, UserId } from "~/server/shared/ids";

import type { Role } from "./identity.types";

export interface ActionObservationsTable {
  id: Generated<string>;
  trace_id: string;
  request_id: string;
  route_path: string | null;
  http_method: string | null;
  action_name: string;
  actor_user_id: NullableIdColumn<UserId>;
  actor_role: Role | null;
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
  is_sensitive: boolean;
  input_summary: string | null;
  created_at: Date;
}

export interface AgentStatusLogsTable {
  id: Generated<string>;
  user_id: IdColumn<UserId>;
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
  started_at: Date;
  ended_at: Date | null;
}

export interface ActionRateLimitCountersTable {
  id: Generated<string>;
  key_hash: string;
  window_started_at: Date;
  request_count: number;
  updated_at: Date;
}

export interface AuthThrottleCountersTable {
  id: Generated<string>;
  scope: "ip" | "account" | "ip_account";
  key_hash: string;
  window_started_at: Date;
  failure_count: number;
  blocked_until: Date | null;
  updated_at: Date;
}

export interface AuthEventsTable {
  id: Generated<string>;
  user_id: NullableIdColumn<UserId>;
  method: "password" | "passkey" | "totp";
  stage: "login" | "challenge" | "verify" | "recovery";
  outcome: "success" | "failure" | "throttled";
  reason: string | null;
  identifier_hash: string;
  ip_hash: string;
  created_at: Date;
}
