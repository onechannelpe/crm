import type { Selectable } from "kysely";

import type { FileAssetsTable } from "~/server/platform/database/types";

import type { FileAsset } from "../types";

export function rowToFileAsset(row: Selectable<FileAssetsTable>): FileAsset {
  return {
    id: row.id,
    storageKey: row.storage_key,
    purpose: row.purpose,
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
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
  };
}
