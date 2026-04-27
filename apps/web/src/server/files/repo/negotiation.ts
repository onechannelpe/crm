import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";

import type { NegotiationFileRecord } from "./types";

type DB = Kysely<Database>;

export function createNegotiationFilesRepo(db: DB) {
  return {
    async insert(input: {
      leadId: string;
      negotiationRequestId: string;
      artifactId: string;
      fileAssetId: number;
      uploadedByUserId: number;
      now: number;
    }) {
      const result = await db
        .insertInto("workflow_negotiation_files")
        .values({
          lead_id: input.leadId,
          negotiation_request_id: input.negotiationRequestId,
          artifact_id: input.artifactId,
          file_asset_id: input.fileAssetId,
          uploaded_by_user_id: input.uploadedByUserId,
          created_at: input.now,
        })
        .executeTakeFirstOrThrow();

      return Number(result.insertId);
    },

    async listByNegotiationRequestId(
      requestId: string,
    ): Promise<NegotiationFileRecord[]> {
      const rows = await db
        .selectFrom("workflow_negotiation_files")
        .innerJoin(
          "workflow_artifacts",
          "workflow_artifacts.id",
          "workflow_negotiation_files.artifact_id",
        )
        .innerJoin(
          "file_assets",
          "file_assets.id",
          "workflow_negotiation_files.file_asset_id",
        )
        .select([
          "workflow_negotiation_files.id as id",
          "workflow_negotiation_files.lead_id as leadId",
          "workflow_negotiation_files.negotiation_request_id as negotiationRequestId",
          "workflow_negotiation_files.artifact_id as artifactId",
          "workflow_negotiation_files.file_asset_id as fileAssetId",
          "workflow_negotiation_files.uploaded_by_user_id as uploadedByUserId",
          "workflow_negotiation_files.created_at as createdAt",
          "workflow_artifacts.status as artifactStatus",
          "file_assets.safe_display_filename as safeDisplayFilename",
          "file_assets.detected_mime as detectedMime",
          "file_assets.size_bytes as sizeBytes",
        ])
        .where(
          "workflow_negotiation_files.negotiation_request_id",
          "=",
          requestId,
        )
        .orderBy("workflow_negotiation_files.created_at", "asc")
        .execute();

      return rows.map((row) => ({
        id: row.id,
        leadId: row.leadId,
        negotiationRequestId: row.negotiationRequestId,
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
    ): Promise<NegotiationFileRecord | null> {
      const row = await db
        .selectFrom("workflow_negotiation_files")
        .innerJoin(
          "workflow_artifacts",
          "workflow_artifacts.id",
          "workflow_negotiation_files.artifact_id",
        )
        .innerJoin(
          "file_assets",
          "file_assets.id",
          "workflow_negotiation_files.file_asset_id",
        )
        .select([
          "workflow_negotiation_files.id as id",
          "workflow_negotiation_files.lead_id as leadId",
          "workflow_negotiation_files.negotiation_request_id as negotiationRequestId",
          "workflow_negotiation_files.artifact_id as artifactId",
          "workflow_negotiation_files.file_asset_id as fileAssetId",
          "workflow_negotiation_files.uploaded_by_user_id as uploadedByUserId",
          "workflow_negotiation_files.created_at as createdAt",
          "workflow_artifacts.status as artifactStatus",
          "file_assets.safe_display_filename as safeDisplayFilename",
          "file_assets.detected_mime as detectedMime",
          "file_assets.size_bytes as sizeBytes",
        ])
        .where("workflow_negotiation_files.artifact_id", "=", artifactId)
        .executeTakeFirst();

      if (!row) return null;

      return {
        id: row.id,
        leadId: row.leadId,
        negotiationRequestId: row.negotiationRequestId,
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
