import type { Selectable } from "kysely";

import type { FileAssetsTable, WorkflowArtifactsTable } from "~/lib/db/types";

import type { FileAsset, WorkflowArtifact } from "../types";

export function rowToArtifact(
  row: Selectable<WorkflowArtifactsTable>,
): WorkflowArtifact {
  return {
    id: row.id,
    artifactType: row.artifact_type,
    direction: row.direction,
    executionMode: row.execution_mode,
    status: row.status,
    requestedByUserId: row.requested_by_user_id,
    scopeBranchId: row.scope_branch_id,
    scopeTeamId: row.scope_team_id,
    policySnapshotJson: row.policy_snapshot_json,
    workflowContextJson: row.workflow_context_json,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToFileAsset(row: Selectable<FileAssetsTable>): FileAsset {
  return {
    id: row.id,
    storageKey: row.storage_key,
    originalFilename: row.original_filename,
    safeDisplayFilename: row.safe_display_filename,
    detectedMime: row.detected_mime,
    extension: row.extension,
    sizeBytes: row.size_bytes,
    sha256Hex: row.sha256_hex,
    signatureKind: row.signature_kind,
    scanStatus: row.scan_status,
    scanEngine: row.scan_engine,
    scanReference: row.scan_reference,
    createdAt: row.created_at,
  };
}
