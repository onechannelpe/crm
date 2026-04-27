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
  requestedByUserId: number;
  scopeBranchId: number | null;
  scopeTeamId: number | null;
  policySnapshotJson: string;
  workflowContextJson: string;
  expiresAt: number | null;
  now: number;
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
  now: number;
}

export interface InsertEventInput {
  artifactId: string;
  eventType: string;
  actorUserId: number | null;
  actorRole: string | null;
  requestId: string | null;
  traceId: string | null;
  ipHash: string | null;
  userAgent: string | null;
  details: Record<string, unknown>;
  now: number;
}

export interface InsertDownloadTokenInput {
  artifactId: string;
  fileAssetId: number;
  tokenHash: string;
  requestedByUserId: number;
  expiresAt: number;
  now: number;
}

export interface SaleProofFileRecord {
  id: number;
  leadId: string;
  saleId: string;
  artifactId: string;
  fileAssetId: number;
  uploadedByUserId: number;
  createdAt: number;
  artifactStatus: ArtifactStatus;
  safeDisplayFilename: string;
  detectedMime: string;
  sizeBytes: number;
}

export interface NegotiationFileRecord {
  id: number;
  leadId: string;
  negotiationRequestId: string;
  artifactId: string;
  fileAssetId: number;
  uploadedByUserId: number;
  createdAt: number;
  artifactStatus: ArtifactStatus;
  safeDisplayFilename: string;
  detectedMime: string;
  sizeBytes: number;
}
