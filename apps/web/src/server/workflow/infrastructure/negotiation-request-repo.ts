import { randomUUIDv7 } from "bun";

import type { DatabaseExecutor } from "~/server/shared/db-executor";

import type {
  LeadNegotiationFile,
  LeadNegotiationRequest,
  NegotiationRequestRepository,
} from "../application/ports/negotiation-request-repository";

export function createNegotiationRequestRepo(
  db: DatabaseExecutor,
): NegotiationRequestRepository {
  return {
    async insert(values: Omit<LeadNegotiationRequest, "id">): Promise<string> {
      const id = randomUUIDv7();
      await db
        .insertInto("workflow_negotiation_requests")
        .values({
          id,
          lead_id: values.leadId,
          round: values.round,
          justification: values.justification,
          requested_by: values.requestedBy,
          requested_at: values.requestedAt,
        })
        .executeTakeFirstOrThrow();
      return id;
    },

    async insertFile(
      values: LeadNegotiationFile & { leadId: string },
    ): Promise<void> {
      await db
        .insertInto("workflow_negotiation_files")
        .values({
          lead_id: values.leadId,
          negotiation_request_id: values.negotiationRequestId,
          artifact_id: values.artifactId,
          file_asset_id: values.fileAssetId,
          uploaded_by_user_id: values.uploadedByUserId,
          created_at: values.createdAt,
        })
        .onConflict((oc) => oc.column("artifact_id").doNothing())
        .executeTakeFirstOrThrow();
    },

    async findFileAssetIdForArtifact(
      artifactId: string,
      leadId: string,
    ): Promise<number | null> {
      const row = await db
        .selectFrom("artifact_file_bindings")
        .innerJoin(
          "workflow_artifacts",
          "workflow_artifacts.id",
          "artifact_file_bindings.artifact_id",
        )
        .select("artifact_file_bindings.file_asset_id")
        .where("artifact_file_bindings.artifact_id", "=", artifactId)
        .where("artifact_file_bindings.binding_role", "=", "source_upload")
        .where("workflow_artifacts.artifact_type", "=", "negotiation_file")
        .where(
          (eb) =>
            eb.fn("json_extract", [
              eb.ref("workflow_artifacts.workflow_context_json"),
              eb.val("$.leadId"),
            ]),
          "=",
          leadId,
        )
        .executeTakeFirst();
      return row?.file_asset_id ?? null;
    },

    async countByLeadId(leadId: string): Promise<number> {
      const row = await db
        .selectFrom("workflow_negotiation_requests")
        .select((eb) => eb.fn.countAll<number>().as("count"))
        .where("lead_id", "=", leadId)
        .executeTakeFirstOrThrow();
      return row.count;
    },

    async listByLeadId(leadId: string): Promise<LeadNegotiationRequest[]> {
      const rows = await db
        .selectFrom("workflow_negotiation_requests")
        .selectAll()
        .where("lead_id", "=", leadId)
        .orderBy("round", "asc")
        .execute();

      return rows.map((row) => ({
        id: row.id,
        leadId: row.lead_id,
        round: row.round,
        justification: row.justification,
        requestedBy: row.requested_by,
        requestedAt: row.requested_at,
      }));
    },
  };
}
