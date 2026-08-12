import type { Generated } from "kysely";

import type {
  FileAssetId,
  FileDownloadTokenId,
  GeneratedId,
  IdColumn,
  UserId,
  WorkflowLeadId,
} from "~/domain/ids";
import type { FilePurpose } from "~/server/files/types";

export interface FileAssetsTable {
  id: GeneratedId<FileAssetId>;
  storage_key: string;
  purpose: FilePurpose;
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
  created_by_user_id: IdColumn<UserId>;
  created_at: Date;
}

export interface FileDownloadTokensTable {
  id: GeneratedId<FileDownloadTokenId>;
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
  file_asset_id: IdColumn<FileAssetId>;
  uploaded_by_user_id: IdColumn<UserId>;
  created_at: Date;
}
