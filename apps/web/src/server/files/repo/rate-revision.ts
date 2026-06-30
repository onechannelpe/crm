import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import type {
  FileAssetId,
  UserId,
  WorkflowArtifactId,
  WorkflowLeadId,
  WorkflowRateRevisionId,
} from "~/server/shared/ids";

import type { RateRevisionFileRecord } from "./types";

type DB = Kysely<Database>;

export function createRateRevisionFilesRepo(db: DB) {
  return {
    async insert(input: {
      leadId: WorkflowLeadId;
      revisionId: WorkflowRateRevisionId;
      artifactId: WorkflowArtifactId;
      fileAssetId: FileAssetId;
      uploadedByUserId: UserId;
      now: Date;
    }) {
      const result = await db
        .insertInto("workflow_rate_revision_files")
        .values({
          lead_id: input.leadId,
          revision_id: input.revisionId,
          artifact_id: input.artifactId,
          file_asset_id: input.fileAssetId,
          uploaded_by_user_id: input.uploadedByUserId,
          created_at: input.now,
        })
        .returning("id")
        .executeTakeFirstOrThrow();

      return result.id;
    },

    async listByRevisionId(
      revisionId: WorkflowRateRevisionId,
    ): Promise<RateRevisionFileRecord[]> {
      const rows = await db
        .selectFrom("workflow_rate_revision_files")
        .innerJoin(
          "workflow_artifacts",
          "workflow_artifacts.id",
          "workflow_rate_revision_files.artifact_id",
        )
        .innerJoin(
          "file_assets",
          "file_assets.id",
          "workflow_rate_revision_files.file_asset_id",
        )
        .select([
          "workflow_rate_revision_files.id as id",
          "workflow_rate_revision_files.lead_id as leadId",
          "workflow_rate_revision_files.revision_id as revisionId",
          "workflow_rate_revision_files.artifact_id as artifactId",
          "workflow_rate_revision_files.file_asset_id as fileAssetId",
          "workflow_rate_revision_files.uploaded_by_user_id as uploadedByUserId",
          "workflow_rate_revision_files.created_at as createdAt",
          "workflow_artifacts.status as artifactStatus",
          "file_assets.safe_display_filename as safeDisplayFilename",
          "file_assets.detected_mime as detectedMime",
          "file_assets.size_bytes as sizeBytes",
        ])
        .where("workflow_rate_revision_files.revision_id", "=", revisionId)
        .orderBy("workflow_rate_revision_files.created_at", "asc")
        .execute();

      return rows.map((row) => ({
        id: row.id,
        leadId: row.leadId,
        revisionId: row.revisionId,
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
      artifactId: WorkflowArtifactId,
    ): Promise<RateRevisionFileRecord | null> {
      const row = await db
        .selectFrom("workflow_rate_revision_files")
        .innerJoin(
          "workflow_artifacts",
          "workflow_artifacts.id",
          "workflow_rate_revision_files.artifact_id",
        )
        .innerJoin(
          "file_assets",
          "file_assets.id",
          "workflow_rate_revision_files.file_asset_id",
        )
        .select([
          "workflow_rate_revision_files.id as id",
          "workflow_rate_revision_files.lead_id as leadId",
          "workflow_rate_revision_files.revision_id as revisionId",
          "workflow_rate_revision_files.artifact_id as artifactId",
          "workflow_rate_revision_files.file_asset_id as fileAssetId",
          "workflow_rate_revision_files.uploaded_by_user_id as uploadedByUserId",
          "workflow_rate_revision_files.created_at as createdAt",
          "workflow_artifacts.status as artifactStatus",
          "file_assets.safe_display_filename as safeDisplayFilename",
          "file_assets.detected_mime as detectedMime",
          "file_assets.size_bytes as sizeBytes",
        ])
        .where("workflow_rate_revision_files.artifact_id", "=", artifactId)
        .executeTakeFirst();

      if (!row) return null;

      return {
        id: row.id,
        leadId: row.leadId,
        revisionId: row.revisionId,
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
