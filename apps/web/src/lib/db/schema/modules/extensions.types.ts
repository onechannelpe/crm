export interface ExtensionHandoffsTable {
  jti: string;
  user_id: number;
  branch_id: number;
  auth_session_id: string;
  assignment_id: number;
  origin: string;
  installation_id: string | null;
  installation_session_jti: string | null;
  issued_at: number;
  expires_at: number;
  consumed_at: number | null;
}

export interface ExtensionInstallationSessionsTable {
  jti: string;
  user_id: number;
  branch_id: number;
  auth_session_id: string;
  installation_id: string;
  refresh_token_hash: string;
  issued_at: number;
  expires_at: number;
  revoked_at: number | null;
  last_seen_at: number | null;
  refreshed_at: number | null;
}

export interface ExtensionRuntimeEventsTable {
  id: string;
  sequence: number;
  user_id: number;
  branch_id: number;
  assignment_id: number | null;
  contact_id: number | null;
  call_session_id: string | null;
  type:
    | "executive.presence"
    | "executive.heartbeat"
    | "call.lifecycle"
    | "call.metric"
    | "recording.completed"
    | "recording.chunk";
  payload_json: string;
  created_at: number;
  received_at: number;
}

export interface ExtensionExecutiveStatusesTable {
  user_id: number;
  branch_id: number;
  assignment_id: number | null;
  contact_id: number | null;
  call_session_id: string | null;
  presence_status:
    | "idle"
    | "ready"
    | "dialing"
    | "active"
    | "wrap_up"
    | "offline"
    | null;
  presence_updated_at: number | null;
  sync_health: "ok" | "stale" | "reauth_required";
  sync_updated_at: number | null;
  source_event_id: string | null;
  source_event_sequence: number | null;
}
