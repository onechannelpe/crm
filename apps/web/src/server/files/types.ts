export const ARTIFACT_TYPES = ["leads_export", "integration_import"] as const;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export const EXECUTION_MODES = ["sync", "async"] as const;
export type ArtifactExecutionMode = (typeof EXECUTION_MODES)[number];

export type ArtifactDirection = "upload" | "download" | "bidirectional";

export function isArtifactType(v: string | undefined): v is ArtifactType {
  return v !== undefined && (ARTIFACT_TYPES as readonly string[]).includes(v);
}

export function isExecutionMode(
  v: string | undefined,
): v is ArtifactExecutionMode {
  return v !== undefined && (EXECUTION_MODES as readonly string[]).includes(v);
}

export type ArtifactStatus =
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

export type ScanStatus = "pending" | "clean" | "infected" | "error";

export type BindingRole = "source_upload" | "export_output" | "derived_output";

export interface WorkflowArtifact {
  id: number;
  artifactType: ArtifactType;
  direction: ArtifactDirection;
  executionMode: ArtifactExecutionMode;
  status: ArtifactStatus;
  requestedByUserId: number;
  scopeBranchId: number | null;
  scopeTeamId: number | null;
  policySnapshotJson: string;
  workflowContextJson: string;
  errorCode: string | null;
  errorMessage: string | null;
  expiresAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface FileAsset {
  id: number;
  storageKey: string;
  originalFilename: string;
  safeDisplayFilename: string;
  detectedMime: string;
  extension: string;
  sizeBytes: number;
  sha256Hex: string;
  signatureKind: string | null;
  scanStatus: ScanStatus;
  scanEngine: string | null;
  scanReference: string | null;
  createdAt: number;
}

export interface ArtifactWithAsset {
  artifact: WorkflowArtifact;
  fileAsset: FileAsset | null;
}

export interface DownloadReady {
  artifact: WorkflowArtifact;
  fileAsset: FileAsset;
  body: ArrayBuffer;
}
