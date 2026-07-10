import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import type { FileAssetId, UserId, WorkflowLeadId } from "~/server/shared/ids";

import type { SaleProofFileRecord } from "./types";

const SALE_PROOF_FILE_SELECTION = [
  "workflow_sale_proof_files.id as id",
  "workflow_sale_proof_files.lead_id as leadId",
  "workflow_sale_proof_files.file_asset_id as fileAssetId",
  "workflow_sale_proof_files.uploaded_by_user_id as uploadedByUserId",
  "workflow_sale_proof_files.created_at as createdAt",
  "file_assets.safe_display_filename as safeDisplayFilename",
  "file_assets.detected_mime as detectedMime",
  "file_assets.size_bytes as sizeBytes",
] as const;

export function createSalesRepo(db: Kysely<Database>) {
  return {
    async insert(input: {
      leadId: WorkflowLeadId;
      fileAssetId: FileAssetId;
      uploadedByUserId: UserId;
      now: Date;
    }) {
      const { id } = await db
        .insertInto("workflow_sale_proof_files")
        .values({
          lead_id: input.leadId,
          file_asset_id: input.fileAssetId,
          uploaded_by_user_id: input.uploadedByUserId,
          created_at: input.now,
        })
        .returning("id")
        .executeTakeFirstOrThrow();

      return id;
    },

    async listByLead(leadId: WorkflowLeadId): Promise<SaleProofFileRecord[]> {
      return db
        .selectFrom("workflow_sale_proof_files")
        .innerJoin(
          "file_assets",
          "file_assets.id",
          "workflow_sale_proof_files.file_asset_id",
        )
        .select(SALE_PROOF_FILE_SELECTION)
        .where("workflow_sale_proof_files.lead_id", "=", leadId)
        .orderBy("workflow_sale_proof_files.created_at", "desc")
        .execute();
    },

    async findByFileAssetId(input: {
      leadId: WorkflowLeadId;
      fileAssetId: FileAssetId;
    }): Promise<SaleProofFileRecord | null> {
      const row = await db
        .selectFrom("workflow_sale_proof_files")
        .innerJoin(
          "file_assets",
          "file_assets.id",
          "workflow_sale_proof_files.file_asset_id",
        )
        .select(SALE_PROOF_FILE_SELECTION)
        .where("workflow_sale_proof_files.lead_id", "=", input.leadId)
        .where(
          "workflow_sale_proof_files.file_asset_id",
          "=",
          input.fileAssetId,
        )
        .executeTakeFirst();

      return row ?? null;
    },
  };
}
