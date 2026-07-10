import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type {
  UserId,
  WorkflowLeadId,
  WorkflowRateRevisionFileId,
  WorkflowRateRevisionId,
} from "~/server/shared/ids";
import type {
  RateRevision,
  SubmitReadyRevisionFile,
} from "~/server/workflow/lead/domain/rows";

export type RateRevisionRepository = {
  insert(values: RateRevision): Promise<void>;
  attachFileToRevision(input: {
    fileId: WorkflowRateRevisionFileId;
    revisionId: WorkflowRateRevisionId;
  }): Promise<void>;
  findSubmitReadyRevisionFile(input: {
    fileId: WorkflowRateRevisionFileId;
    leadId: WorkflowLeadId;
    uploadedByUserId: UserId;
  }): Promise<SubmitReadyRevisionFile | null>;
  countByLeadId(leadId: WorkflowLeadId): Promise<number>;
  listByLeadId(leadId: WorkflowLeadId): Promise<RateRevision[]>;
};

export function createRateRevisionRepo(
  db: DatabaseExecutor,
): RateRevisionRepository {
  return {
    async insert(values: RateRevision): Promise<void> {
      await db
        .insertInto("workflow_rate_revisions")
        .values({
          id: values.id,
          lead_id: values.leadId,
          proposal_id: values.proposalId,
          round: values.round,
          justification: values.justification,
          requested_by: values.requestedBy,
          requested_at: values.requestedAt,
        })
        .executeTakeFirstOrThrow();
    },

    async attachFileToRevision(input): Promise<void> {
      await db
        .updateTable("workflow_rate_revision_files")
        .set({ revision_id: input.revisionId })
        .where("id", "=", input.fileId)
        .where("revision_id", "is", null)
        .executeTakeFirstOrThrow();
    },

    async findSubmitReadyRevisionFile(input) {
      const row = await db
        .selectFrom("workflow_rate_revision_files")
        .select(["id as fileId", "file_asset_id as fileAssetId"])
        .where("id", "=", input.fileId)
        .where("lead_id", "=", input.leadId)
        .where("uploaded_by_user_id", "=", input.uploadedByUserId)
        .where("revision_id", "is", null)
        .executeTakeFirst();

      return row ? { fileId: row.fileId, fileAssetId: row.fileAssetId } : null;
    },

    async countByLeadId(leadId: WorkflowLeadId): Promise<number> {
      const row = await db
        .selectFrom("workflow_rate_revisions")
        .select((eb) => eb.fn.countAll<number>().as("count"))
        .where("lead_id", "=", leadId)
        .executeTakeFirstOrThrow();
      return row.count;
    },

    async listByLeadId(leadId: WorkflowLeadId): Promise<RateRevision[]> {
      const rows = await db
        .selectFrom("workflow_rate_revisions")
        .selectAll()
        .where("lead_id", "=", leadId)
        .orderBy("round", "asc")
        .execute();

      return rows.map((row) => ({
        id: row.id,
        leadId: row.lead_id,
        proposalId: row.proposal_id,
        round: row.round,
        justification: row.justification,
        requestedBy: row.requested_by,
        requestedAt: row.requested_at,
      }));
    },
  };
}
