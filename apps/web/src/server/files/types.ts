import type { FileAssetId, UserId } from "~/server/shared/ids";

export const FILE_PURPOSES = [
  "records_export",
  "merchant_gpv_export",
  "merchant_gpv_snapshot",
  "integration_import",
  "sale_proof",
  "rate_revision_file",
  "transactions_report",
  "addendum_unsigned",
  "addendum_signed_photo",
  "addendum_signed_pdf",
  "payment_proof",
] as const;
export type FilePurpose = (typeof FILE_PURPOSES)[number];

export type ScanStatus = "pending" | "clean" | "infected" | "error";

export interface FileAsset {
  id: FileAssetId;
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
  scanEngine: string | null;
  scanReference: string | null;
  createdByUserId: UserId;
  createdAt: Date;
}

export interface DownloadReady {
  fileAsset: FileAsset;
  body: ArrayBuffer;
}
