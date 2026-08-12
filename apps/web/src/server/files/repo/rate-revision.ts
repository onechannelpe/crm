import type { Kysely } from "kysely";

import type {
  FileAssetId,
  UserId,
  WorkflowLeadId,
  WorkflowRateRevisionFileId,
  WorkflowRateRevisionId,
} from "~/domain/ids";
import type { Database } from "~/server/platform/database/types";

import type { RateRevisionFileRecord } from "./types";

const RATE_REVISION_FILE_SELECTION = [
  "workflow_rate_revision_files.id as id",
  "workflow_rate_revision_files.lead_id as leadId",
  "workflow_rate_revision_files.revision_id as revisionId",
  "workflow_rate_revision_files.file_asset_id as fileAssetId",
  "workflow_rate_revision_files.uploaded_by_user_id as uploadedByUserId",
  "workflow_rate_revision_files.created_at as createdAt",
  "file_assets.safe_display_filename as safeDisplayFilename",
  "file_assets.detected_mime as detectedMime",
  "file_assets.size_bytes as sizeBytes",
] as const;

export function createRateRevisionFilesRepo(db: Kysely<Database>) {
  return {
    async stage(input: {
      leadId: WorkflowLeadId;
      fileAssetId: FileAssetId;
      uploadedByUserId: UserId;
      createdAt: Date;
    }): Promise<RateRevisionFileRecord> {
      const { id } = await db
        .insertInto("workflow_rate_revision_files")
        .values({
          lead_id: input.leadId,
          revision_id: null,
          file_asset_id: input.fileAssetId,
          uploaded_by_user_id: input.uploadedByUserId,
          created_at: input.createdAt,
        })
        .returning("id")
        .executeTakeFirstOrThrow();

      const stagedFile = await db
        .selectFrom("workflow_rate_revision_files")
        .innerJoin(
          "file_assets",
          "file_assets.id",
          "workflow_rate_revision_files.file_asset_id",
        )
        .select(RATE_REVISION_FILE_SELECTION)
        .where("workflow_rate_revision_files.id", "=", id)
        .executeTakeFirst();

      if (!stagedFile) {
        throw new Error("staged_rate_revision_file_missing");
      }

      return stagedFile;
    },

    async listByRevisionId(
      revisionId: WorkflowRateRevisionId,
    ): Promise<RateRevisionFileRecord[]> {
      return db
        .selectFrom("workflow_rate_revision_files")
        .innerJoin(
          "file_assets",
          "file_assets.id",
          "workflow_rate_revision_files.file_asset_id",
        )
        .select(RATE_REVISION_FILE_SELECTION)
        .where("workflow_rate_revision_files.revision_id", "=", revisionId)
        .orderBy("workflow_rate_revision_files.created_at", "asc")
        .execute();
    },

    async findById(
      fileId: WorkflowRateRevisionFileId,
    ): Promise<RateRevisionFileRecord | null> {
      const row = await db
        .selectFrom("workflow_rate_revision_files")
        .innerJoin(
          "file_assets",
          "file_assets.id",
          "workflow_rate_revision_files.file_asset_id",
        )
        .select(RATE_REVISION_FILE_SELECTION)
        .where("workflow_rate_revision_files.id", "=", fileId)
        .executeTakeFirst();

      return row ?? null;
    },

    async findSubmitReady(input: {
      fileId: WorkflowRateRevisionFileId;
      leadId: WorkflowLeadId;
      uploadedByUserId: UserId;
    }): Promise<RateRevisionFileRecord | null> {
      const row = await db
        .selectFrom("workflow_rate_revision_files")
        .innerJoin(
          "file_assets",
          "file_assets.id",
          "workflow_rate_revision_files.file_asset_id",
        )
        .select(RATE_REVISION_FILE_SELECTION)
        .where("workflow_rate_revision_files.id", "=", input.fileId)
        .where("workflow_rate_revision_files.lead_id", "=", input.leadId)
        .where(
          "workflow_rate_revision_files.uploaded_by_user_id",
          "=",
          input.uploadedByUserId,
        )
        .where("workflow_rate_revision_files.revision_id", "is", null)
        .executeTakeFirst();

      return row ?? null;
    },

    async attachToRevision(input: {
      fileId: WorkflowRateRevisionFileId;
      revisionId: WorkflowRateRevisionId;
    }): Promise<void> {
      const result = await db
        .updateTable("workflow_rate_revision_files")
        .set({ revision_id: input.revisionId })
        .where("id", "=", input.fileId)
        .where("revision_id", "is", null)
        .executeTakeFirst();

      if (result.numUpdatedRows !== 1n) {
        throw new Error("rate_revision_file_attach_failed");
      }
    },
  };
}
