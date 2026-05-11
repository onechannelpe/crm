import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";

import type { SaleProofFileRecord } from "./types";

type DB = Kysely<Database>;

export function createSalesRepo(db: DB) {
  return {
    async insert(input: {
      leadId: string;
      artifactId: string;
      fileAssetId: number;
      uploadedByUserId: number;
      now: number;
    }) {
      const result = await db
        .insertInto("workflow_sale_proof_files")
        .values({
          lead_id: input.leadId,
          artifact_id: input.artifactId,
          file_asset_id: input.fileAssetId,
          uploaded_by_user_id: input.uploadedByUserId,
          created_at: input.now,
        })
        .executeTakeFirstOrThrow();

      return Number(result.insertId);
    },

    async listByLead(leadId: string): Promise<SaleProofFileRecord[]> {
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

    async findByArtifactId(
      artifactId: string,
    ): Promise<SaleProofFileRecord | null> {
      const row = await db
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
          "workflow_sale_proof_files.artifact_id as artifactId",
          "workflow_sale_proof_files.file_asset_id as fileAssetId",
          "workflow_sale_proof_files.uploaded_by_user_id as uploadedByUserId",
          "workflow_sale_proof_files.created_at as createdAt",
          "workflow_artifacts.status as artifactStatus",
          "file_assets.safe_display_filename as safeDisplayFilename",
          "file_assets.detected_mime as detectedMime",
          "file_assets.size_bytes as sizeBytes",
        ])
        .where("workflow_sale_proof_files.artifact_id", "=", artifactId)
        .executeTakeFirst();

      if (!row) return null;

      return {
        id: row.id,
        leadId: row.leadId,
        artifactId: row.artifactId,
        fileAssetId: row.fileAssetId,
        uploadedByUserId: row.uploadedByUserId,
        createdAt: row.createdAt,
        artifactStatus: row.artifactStatus,
        safeDisplayFilename: row.safeDisplayFilename,
        detectedMime: row.detectedMime,
        sizeBytes: row.sizeBytes,
      };
    },
  };
}
