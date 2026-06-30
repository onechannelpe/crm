import { sql } from "kysely";

import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type {
  RateRevision,
  RateRevisionFile,
  SubmitReadyRevisionFile,
} from "~/server/workflow/lead/domain/rows";

export type RateRevisionRepository = {
  insert(values: RateRevision): Promise<void>;
  insertFile(values: RateRevisionFile & { leadId: string }): Promise<void>;
  findSubmitReadyRevisionFile(input: {
    artifactId: string;
    leadId: string;
    uploadedByUserId: number;
  }): Promise<SubmitReadyRevisionFile | null>;
  countByLeadId(leadId: string): Promise<number>;
  listByLeadId(leadId: string): Promise<RateRevision[]>;
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

    async insertFile(
      values: RateRevisionFile & { leadId: string },
    ): Promise<void> {
      await db
        .insertInto("workflow_rate_revision_files")
        .values({
          lead_id: values.leadId,
          revision_id: values.revisionId,
          artifact_id: values.artifactId,
          file_asset_id: values.fileAssetId,
          uploaded_by_user_id: values.uploadedByUserId,
          created_at: values.createdAt,
        })
        .executeTakeFirstOrThrow();
    },

    async findSubmitReadyRevisionFile(input: {
      artifactId: string;
      leadId: string;
      uploadedByUserId: number;
    }) {
      const row = await db
        .selectFrom("artifact_file_bindings")
        .innerJoin(
          "workflow_artifacts",
          "workflow_artifacts.id",
          "artifact_file_bindings.artifact_id",
        )
        .select([
          "artifact_file_bindings.artifact_id as artifactId",
          "artifact_file_bindings.file_asset_id as fileAssetId",
        ])
        .where("artifact_file_bindings.artifact_id", "=", input.artifactId)
        .where("artifact_file_bindings.binding_role", "=", "source_upload")
        .where("workflow_artifacts.artifact_type", "=", "rate_revision_file")
        .where("workflow_artifacts.status", "=", "ready")
        .where(
          "workflow_artifacts.requested_by_user_id",
          "=",
          input.uploadedByUserId,
        )
        .where(
          sql<string>`${sql.ref("workflow_artifacts.workflow_context_json")} ->> 'leadId'`,
          "=",
          input.leadId,
        )
        .where((eb) =>
          eb.not(
            eb.exists(
              eb
                .selectFrom("workflow_rate_revision_files")
                .select("id")
                .whereRef(
                  "workflow_rate_revision_files.artifact_id",
                  "=",
                  "artifact_file_bindings.artifact_id",
                ),
            ),
          ),
        )
        .executeTakeFirst();

      return row
        ? { artifactId: row.artifactId, fileAssetId: row.fileAssetId }
        : null;
    },

    async countByLeadId(leadId: string): Promise<number> {
      const row = await db
        .selectFrom("workflow_rate_revisions")
        .select((eb) => eb.fn.countAll<number>().as("count"))
        .where("lead_id", "=", leadId)
        .executeTakeFirstOrThrow();
      return row.count;
    },

    async listByLeadId(leadId: string): Promise<RateRevision[]> {
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
