import type { Generated } from "kysely";

export interface WorkflowArtifactsTable {
  id: string;
  artifact_type: "records_export" | "integration_import";
  direction: "upload" | "download" | "bidirectional";
  execution_mode: "sync" | "async";
  status:
    | "requested"
    | "receiving"
    | "validating"
    | "scanning"
    | "ready"
    | "processing"
    | "completed"
    | "failed"
    | "expired"
    | "revoked";
  requested_by_user_id: number;
  scope_branch_id: number | null;
  scope_team_id: number | null;
  policy_snapshot_json: string;
  workflow_context_json: string;
  error_code: string | null;
  error_message: string | null;
  expires_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface FileAssetsTable {
  id: Generated<number>;
  storage_key: string;
  original_filename: string;
  safe_display_filename: string;
  detected_mime: string;
  extension: string;
  size_bytes: number;
  sha256_hex: string;
  signature_kind: string | null;
  scan_status: "pending" | "clean" | "infected" | "error";
  scan_engine: string | null;
  scan_reference: string | null;
  created_at: number;
}

export interface ArtifactFileBindingsTable {
  id: Generated<number>;
  artifact_id: string;
  file_asset_id: number;
  binding_role: "source_upload" | "export_output" | "derived_output";
  version_no: number;
  created_at: number;
}

export interface ArtifactEventsTable {
  id: Generated<number>;
  artifact_id: string;
  event_type: string;
  actor_user_id: number | null;
  actor_role: string | null;
  request_id: string | null;
  trace_id: string | null;
  ip_hash: string | null;
  user_agent: string | null;
  details_json: string;
  created_at: number;
}

export interface ArtifactDownloadTokensTable {
  id: Generated<number>;
  artifact_id: string;
  file_asset_id: number;
  token_hash: string;
  requested_by_user_id: number;
  expires_at: number;
  used_at: number | null;
  created_at: number;
}

export type Db = {
  workflow_artifacts: WorkflowArtifactsTable;
  file_assets: FileAssetsTable;
  artifact_file_bindings: ArtifactFileBindingsTable;
  artifact_events: ArtifactEventsTable;
  artifact_download_tokens: ArtifactDownloadTokensTable;
};
