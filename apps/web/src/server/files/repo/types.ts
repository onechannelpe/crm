import type {
  BranchId,
  FileAssetId,
  TeamId,
  UserId,
  WorkflowArtifactId,
  WorkflowLeadId,
  WorkflowRateRevisionId,
} from "~/server/shared/ids";

import type {
  ArtifactDirection,
  ArtifactExecutionMode,
  ArtifactStatus,
  ArtifactType,
  ScanStatus,
} from "../types";

export interface InsertArtifactInput {
  artifactType: ArtifactType;
  direction: ArtifactDirection;
  executionMode: ArtifactExecutionMode;
  status: ArtifactStatus;
  requestedByUserId: UserId;
  scopeBranchId: BranchId | null;
  scopeTeamId: TeamId | null;
  policySnapshotJson: string;
  workflowContextJson: string;
  expiresAt: Date | null;
  now: Date;
}

export interface InsertFileAssetInput {
  storageKey: string;
  originalFilename: string;
  safeDisplayFilename: string;
  detectedMime: string;
  extension: string;
  sizeBytes: number;
  sha256Hex: string;
  signatureKind: string | null;
  scanStatus: ScanStatus;
  now: Date;
}

export interface InsertEventInput {
  artifactId: WorkflowArtifactId;
  eventType: string;
  actorUserId: UserId | null;
  actorRole: string | null;
  requestId: string | null;
  traceId: string | null;
  ipHash: string | null;
  userAgent: string | null;
  details: Record<string, unknown>;
  now: Date;
}

export interface InsertDownloadTokenInput {
  artifactId: WorkflowArtifactId;
  fileAssetId: FileAssetId;
  tokenHash: string;
  requestedByUserId: UserId;
  expiresAt: Date;
  now: Date;
}

export interface SaleProofFileRecord {
  id: string;
  leadId: WorkflowLeadId;
  artifactId: WorkflowArtifactId;
  fileAssetId: FileAssetId;
  uploadedByUserId: UserId;
  createdAt: Date;
  artifactStatus: ArtifactStatus;
  safeDisplayFilename: string;
  detectedMime: string;
  sizeBytes: number;
}

export interface RateRevisionFileRecord {
  id: WorkflowRateRevisionId;
  leadId: WorkflowLeadId;
  revisionId: WorkflowRateRevisionId;
  artifactId: WorkflowArtifactId;
  fileAssetId: FileAssetId;
  uploadedByUserId: UserId;
  createdAt: Date;
  artifactStatus: ArtifactStatus;
  safeDisplayFilename: string;
  detectedMime: string;
  sizeBytes: number;
}
