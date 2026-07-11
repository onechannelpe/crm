import type { Json } from "~/contracts/json";
import type {
  BranchId,
  ContactAssignmentId,
  IdColumn,
  InstallationId,
  NullableIdColumn,
  OrganizationPersonId,
  UserId,
} from "~/server/shared/ids";

export interface ExtensionHandoffsTable {
  jti: string;
  user_id: IdColumn<UserId>;
  branch_id: IdColumn<BranchId>;
  auth_session_id: string;
  assignment_id: IdColumn<ContactAssignmentId>;
  origin: string;
  installation_id: NullableIdColumn<InstallationId>;
  installation_session_jti: string | null;
  issued_at: Date;
  expires_at: Date;
  consumed_at: Date | null;
}

export interface ExtensionInstallationSessionsTable {
  jti: string;
  user_id: IdColumn<UserId>;
  branch_id: IdColumn<BranchId>;
  auth_session_id: string;
  installation_id: IdColumn<InstallationId>;
  refresh_token_hash: string;
  issued_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
  last_seen_at: Date | null;
  refreshed_at: Date | null;
}

export interface ExtensionRuntimeEventsTable {
  id: string;
  sequence: number;
  user_id: IdColumn<UserId>;
  branch_id: IdColumn<BranchId>;
  assignment_id: NullableIdColumn<ContactAssignmentId>;
  contact_id: NullableIdColumn<OrganizationPersonId>;
  call_session_id: string | null;
  type:
    | "executive.presence"
    | "executive.heartbeat"
    | "call.lifecycle"
    | "call.metric"
    | "recording.completed"
    | "recording.chunk";
  payload_json: Json;
  created_at: Date;
  received_at: Date;
}

export interface ExtensionExecutiveStatusesTable {
  user_id: IdColumn<UserId>;
  branch_id: IdColumn<BranchId>;
  assignment_id: NullableIdColumn<ContactAssignmentId>;
  contact_id: NullableIdColumn<OrganizationPersonId>;
  call_session_id: string | null;
  presence_status:
    | "idle"
    | "ready"
    | "dialing"
    | "active"
    | "wrap_up"
    | "offline"
    | null;
  presence_updated_at: Date | null;
  sync_health: "ok" | "stale" | "reauth_required";
  sync_updated_at: Date | null;
  source_event_id: string | null;
  source_event_sequence: number | null;
}
