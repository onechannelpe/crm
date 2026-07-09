import type { Json } from "~/contracts/json";
import type {
  BranchId,
  FileAssetId,
  TeamId,
  UserId,
  WorkflowArtifactId,
} from "~/server/shared/ids";

const ARTIFACT_TYPES = [
  "records_export",
  "integration_import",
  "sale_proof",
  "rate_revision_file",
  "transactions_report",
  "addendum_unsigned",
  "addendum_signed_photo",
  "addendum_signed_pdf",
  "payment_proof",
] as const;
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

// Fulfillment documents the executive uploads/reads on their own leads without
// the broad file:artifact:* grant that back office carries.
export const EXECUTIVE_OWNED_ARTIFACT_TYPES = [
  "sale_proof",
  "rate_revision_file",
  "addendum_signed_photo",
  "payment_proof",
] as const;

const EXECUTION_MODES = ["sync", "async"] as const;
export type ArtifactExecutionMode = (typeof EXECUTION_MODES)[number];

export type ArtifactDirection = "upload" | "download" | "bidirectional";

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
  id: WorkflowArtifactId;
  artifactType: ArtifactType;
  direction: ArtifactDirection;
  executionMode: ArtifactExecutionMode;
  status: ArtifactStatus;
  requestedByUserId: UserId;
  scopeBranchId: BranchId | null;
  scopeTeamId: TeamId | null;
  policySnapshotJson: Json;
  workflowContextJson: Json;
  errorCode: string | null;
  errorMessage: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileAsset {
  id: FileAssetId;
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
  createdAt: Date;
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
