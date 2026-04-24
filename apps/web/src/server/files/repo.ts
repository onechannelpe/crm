import { randomUUIDv7 } from "bun";
import type { Kysely, Selectable } from "kysely";

import type {
  Database,
  FileAssetsTable,
  WorkflowArtifactsTable,
} from "~/lib/db/types";

import type {
  ArtifactDirection,
  ArtifactExecutionMode,
  ArtifactStatus,
  ArtifactType,
  BindingRole,
  FileAsset,
  ScanStatus,
  WorkflowArtifact,
} from "./types";

type DB = Kysely<Database>;

function rowToArtifact(
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

function rowToFileAsset(row: Selectable<FileAssetsTable>): FileAsset {
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

export interface ArtifactRepo {
  insertArtifact(input: InsertArtifactInput): Promise<string>;
  updateArtifactStatus(
    id: string,
    status: ArtifactStatus,
    now: number,
    error?: { code: string; message: string },
  ): Promise<void>;
  findArtifactById(id: string): Promise<WorkflowArtifact | null>;
  listArtifacts(filters: {
    artifactType?: ArtifactType;
    scopeBranchId?: number;
    limit: number;
    offset?: number;
  }): Promise<WorkflowArtifact[]>;

  insertFileAsset(input: InsertFileAssetInput): Promise<number>;
  findFileAssetById(id: number): Promise<FileAsset | null>;
  findFileAssetForArtifact(
    artifactId: string,
    role: BindingRole,
  ): Promise<FileAsset | null>;

  insertFileBinding(input: {
    artifactId: string;
    fileAssetId: number;
    bindingRole: BindingRole;
    versionNo: number;
    now: number;
  }): Promise<void>;

  insertEvent(input: InsertEventInput): Promise<void>;
  listEvents(artifactId: string): Promise<
    Array<{
      id: number;
      eventType: string;
      actorUserId: number | null;
      actorRole: string | null;
      details: Record<string, unknown>;
      createdAt: number;
    }>
  >;

  insertDownloadToken(input: InsertDownloadTokenInput): Promise<void>;
  findDownloadToken(tokenHash: string): Promise<{
    id: number;
    artifactId: string;
    fileAssetId: number;
    requestedByUserId: number;
    expiresAt: number;
    usedAt: number | null;
  } | null>;
  markDownloadTokenUsed(tokenHash: string, usedAt: number): Promise<boolean>;
  insertSaleProofFile(input: {
    leadId: string;
    saleId: string;
    artifactId: string;
    fileAssetId: number;
    uploadedByUserId: number;
    now: number;
  }): Promise<number>;
  listSaleProofFilesByLead(leadId: string): Promise<SaleProofFileRecord[]>;
}

export function createArtifactRepo(db: DB): ArtifactRepo {
  return {
    async insertArtifact(input) {
      const id = randomUUIDv7();
      await db
        .insertInto("workflow_artifacts")
        .values({
          id,
          artifact_type: input.artifactType,
          direction: input.direction,
          execution_mode: input.executionMode,
          status: input.status,
          requested_by_user_id: input.requestedByUserId,
          scope_branch_id: input.scopeBranchId,
          scope_team_id: input.scopeTeamId,
          policy_snapshot_json: input.policySnapshotJson,
          workflow_context_json: input.workflowContextJson,
          error_code: null,
          error_message: null,
          expires_at: input.expiresAt,
          created_at: input.now,
          updated_at: input.now,
        })
        .executeTakeFirstOrThrow();
      return id;
    },

    async updateArtifactStatus(id, status, now, error) {
      await db
        .updateTable("workflow_artifacts")
        .set({
          status,
          updated_at: now,
          error_code: error?.code ?? null,
          error_message: error?.message ?? null,
        })
        .where("id", "=", id)
        .execute();
    },

    async findArtifactById(id) {
      const row = await db
        .selectFrom("workflow_artifacts")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
      return row ? rowToArtifact(row) : null;
    },

    async listArtifacts({ artifactType, scopeBranchId, limit, offset = 0 }) {
      let query = db
        .selectFrom("workflow_artifacts")
        .selectAll()
        .orderBy("created_at", "desc")
        .limit(limit)
        .offset(offset);

      if (artifactType) {
        query = query.where("artifact_type", "=", artifactType);
      }
      if (scopeBranchId !== undefined) {
        query = query.where("scope_branch_id", "=", scopeBranchId);
      }

      const rows = await query.execute();
      return rows.map(rowToArtifact);
    },

    async insertFileAsset(input) {
      const result = await db
        .insertInto("file_assets")
        .values({
          storage_key: input.storageKey,
          original_filename: input.originalFilename,
          safe_display_filename: input.safeDisplayFilename,
          detected_mime: input.detectedMime,
          extension: input.extension,
          size_bytes: input.sizeBytes,
          sha256_hex: input.sha256Hex,
          signature_kind: input.signatureKind,
          scan_status: input.scanStatus,
          scan_engine: null,
          scan_reference: null,
          created_at: input.now,
        })
        .executeTakeFirstOrThrow();
      return Number(result.insertId);
    },

    async findFileAssetById(id) {
      const row = await db
        .selectFrom("file_assets")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
      return row ? rowToFileAsset(row) : null;
    },

    async findFileAssetForArtifact(artifactId, role) {
      const row = await db
        .selectFrom("artifact_file_bindings")
        .innerJoin(
          "file_assets",
          "file_assets.id",
          "artifact_file_bindings.file_asset_id",
        )
        .select([
          "file_assets.id",
          "file_assets.storage_key",
          "file_assets.original_filename",
          "file_assets.safe_display_filename",
          "file_assets.detected_mime",
          "file_assets.extension",
          "file_assets.size_bytes",
          "file_assets.sha256_hex",
          "file_assets.signature_kind",
          "file_assets.scan_status",
          "file_assets.scan_engine",
          "file_assets.scan_reference",
          "file_assets.created_at",
        ])
        .where("artifact_file_bindings.artifact_id", "=", artifactId)
        .where("artifact_file_bindings.binding_role", "=", role)
        .orderBy("artifact_file_bindings.version_no", "desc")
        .executeTakeFirst();
      return row ? rowToFileAsset(row) : null;
    },

    async insertFileBinding({
      artifactId,
      fileAssetId,
      bindingRole,
      versionNo,
      now,
    }) {
      await db
        .insertInto("artifact_file_bindings")
        .values({
          artifact_id: artifactId,
          file_asset_id: fileAssetId,
          binding_role: bindingRole,
          version_no: versionNo,
          created_at: now,
        })
        .execute();
    },

    async insertEvent(input) {
      await db
        .insertInto("artifact_events")
        .values({
          artifact_id: input.artifactId,
          event_type: input.eventType,
          actor_user_id: input.actorUserId,
          actor_role: input.actorRole,
          request_id: input.requestId,
          trace_id: input.traceId,
          ip_hash: input.ipHash,
          user_agent: input.userAgent,
          details_json: JSON.stringify(input.details),
          created_at: input.now,
        })
        .execute();
    },

    async listEvents(artifactId) {
      const rows = await db
        .selectFrom("artifact_events")
        .selectAll()
        .where("artifact_id", "=", artifactId)
        .orderBy("created_at", "asc")
        .execute();

      return rows.map((row) => ({
        id: row.id,
        eventType: row.event_type,
        actorUserId: row.actor_user_id,
        actorRole: row.actor_role,
        // oxlint-disable-next-line no-unsafe-type-assertion
        details: JSON.parse(row.details_json) as Record<string, unknown>,
        createdAt: row.created_at,
      }));
    },

    async insertDownloadToken(input) {
      await db
        .insertInto("artifact_download_tokens")
        .values({
          artifact_id: input.artifactId,
          file_asset_id: input.fileAssetId,
          token_hash: input.tokenHash,
          requested_by_user_id: input.requestedByUserId,
          expires_at: input.expiresAt,
          used_at: null,
          created_at: input.now,
        })
        .execute();
    },

    async findDownloadToken(tokenHash) {
      return db
        .selectFrom("artifact_download_tokens")
        .select([
          "id",
          "artifact_id",
          "file_asset_id",
          "requested_by_user_id",
          "expires_at",
          "used_at",
        ])
        .where("token_hash", "=", tokenHash)
        .executeTakeFirst()
        .then((row) =>
          row
            ? {
                id: row.id,
                artifactId: row.artifact_id,
                fileAssetId: row.file_asset_id,
                requestedByUserId: row.requested_by_user_id,
                expiresAt: row.expires_at,
                usedAt: row.used_at,
              }
            : null,
        );
    },

    async markDownloadTokenUsed(tokenHash, usedAt) {
      const result = await db
        .updateTable("artifact_download_tokens")
        .set({ used_at: usedAt })
        .where("token_hash", "=", tokenHash)
        .where("used_at", "is", null)
        .executeTakeFirst();

      return Number(result.numUpdatedRows) > 0;
    },

    async insertSaleProofFile(input) {
      const result = await db
        .insertInto("workflow_sale_proof_files")
        .values({
          lead_id: input.leadId,
          sale_id: input.saleId,
          artifact_id: input.artifactId,
          file_asset_id: input.fileAssetId,
          uploaded_by_user_id: input.uploadedByUserId,
          created_at: input.now,
        })
        .executeTakeFirstOrThrow();

      return Number(result.insertId);
    },

    async listSaleProofFilesByLead(leadId) {
      const rows = await db
        .selectFrom("workflow_sale_proof_files")
        .innerJoin(
          "workflow_artifacts",
          "workflow_artifacts.id",
          "workflow_sale_proof_files.artifact_id",
        )
        .innerJoin(
          "file_assets",
          "file_assets.id",
          "workflow_sale_proof_files.file_asset_id",
        )
        .select([
          "workflow_sale_proof_files.id as id",
          "workflow_sale_proof_files.lead_id as leadId",
          "workflow_sale_proof_files.sale_id as saleId",
          "workflow_sale_proof_files.artifact_id as artifactId",
          "workflow_sale_proof_files.file_asset_id as fileAssetId",
          "workflow_sale_proof_files.uploaded_by_user_id as uploadedByUserId",
          "workflow_sale_proof_files.created_at as createdAt",
          "workflow_artifacts.status as artifactStatus",
          "file_assets.safe_display_filename as safeDisplayFilename",
          "file_assets.detected_mime as detectedMime",
          "file_assets.size_bytes as sizeBytes",
        ])
        .where("workflow_sale_proof_files.lead_id", "=", leadId)
        .orderBy("workflow_sale_proof_files.created_at", "desc")
        .execute();

      return rows.map((row) => ({
        id: row.id,
        leadId: row.leadId,
        saleId: row.saleId,
        artifactId: row.artifactId,
        fileAssetId: row.fileAssetId,
        uploadedByUserId: row.uploadedByUserId,
        createdAt: row.createdAt,
        artifactStatus: row.artifactStatus,
        safeDisplayFilename: row.safeDisplayFilename,
        detectedMime: row.detectedMime,
        sizeBytes: row.sizeBytes,
      }));
    },
  };
}
