import type { Generated } from "kysely";

import type {
  ArtifactDownloadTokenId,
  BranchId,
  EventId,
  FileAssetId,
  GeneratedId,
  IdColumn,
  NullableIdColumn,
  TeamId,
  UserId,
  WorkflowArtifactId,
  WorkflowLeadId,
} from "~/server/shared/ids";

export interface WorkflowArtifactsTable {
  id: IdColumn<WorkflowArtifactId>;
  artifact_type:
    | "records_export"
    | "integration_import"
    | "sale_proof"
    | "rate_revision_file"
    | "transactions_report"
    | "addendum_unsigned"
    | "addendum_signed_photo"
    | "addendum_signed_pdf"
    | "payment_proof";
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
  requested_by_user_id: IdColumn<UserId>;
  scope_branch_id: NullableIdColumn<BranchId>;
  scope_team_id: NullableIdColumn<TeamId>;
  policy_snapshot_json: unknown;
  workflow_context_json: unknown;
  error_code: string | null;
  error_message: string | null;
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface FileAssetsTable {
  id: GeneratedId<FileAssetId>;
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
  created_at: Date;
}

export interface ArtifactFileBindingsTable {
  id: Generated<string>;
  artifact_id: IdColumn<WorkflowArtifactId>;
  file_asset_id: IdColumn<FileAssetId>;
  binding_role: "source_upload" | "export_output" | "derived_output";
  version_no: number;
  created_at: Date;
}

export interface ArtifactEventsTable {
  id: GeneratedId<EventId>;
  artifact_id: IdColumn<WorkflowArtifactId>;
  event_type: string;
  actor_user_id: NullableIdColumn<UserId>;
  actor_role: string | null;
  request_id: string | null;
  trace_id: string | null;
  ip_hash: string | null;
  user_agent: string | null;
  details_json: unknown;
  created_at: Date;
}

export interface ArtifactDownloadTokensTable {
  id: GeneratedId<ArtifactDownloadTokenId>;
  artifact_id: IdColumn<WorkflowArtifactId>;
  file_asset_id: IdColumn<FileAssetId>;
  token_hash: string;
  requested_by_user_id: IdColumn<UserId>;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

export interface WorkflowSaleProofFilesTable {
  id: Generated<string>;
  lead_id: IdColumn<WorkflowLeadId>;
  artifact_id: IdColumn<WorkflowArtifactId>;
  file_asset_id: IdColumn<FileAssetId>;
  uploaded_by_user_id: IdColumn<UserId>;
  created_at: Date;
}
