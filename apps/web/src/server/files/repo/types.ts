import type {
  FileAssetId,
  UserId,
  WorkflowLeadId,
  WorkflowRateRevisionFileId,
  WorkflowRateRevisionId,
} from "~/server/shared/ids";

import type { FilePurpose, ScanStatus } from "../types";

export interface InsertFileAssetInput {
  storageKey: string;
  purpose: FilePurpose;
  originalFilename: string;
  safeDisplayFilename: string;
  detectedMime: string;
  extension: string;
  sizeBytes: number;
  sha256Hex: string;
  signatureKind: string | null;
  scanStatus: ScanStatus;
  createdByUserId: UserId;
  now: Date;
}

export interface InsertDownloadTokenInput {
  fileAssetId: FileAssetId;
  tokenHash: string;
  requestedByUserId: UserId;
  expiresAt: Date;
  now: Date;
}

export interface SaleProofFileRecord {
  id: string;
  leadId: WorkflowLeadId;
  fileAssetId: FileAssetId;
  uploadedByUserId: UserId;
  createdAt: Date;
  safeDisplayFilename: string;
  detectedMime: string;
  sizeBytes: number;
}

export interface RateRevisionFileRecord {
  id: WorkflowRateRevisionFileId;
  leadId: WorkflowLeadId;
  revisionId: WorkflowRateRevisionId | null;
  fileAssetId: FileAssetId;
  uploadedByUserId: UserId;
  createdAt: Date;
  safeDisplayFilename: string;
  detectedMime: string;
  sizeBytes: number;
}
