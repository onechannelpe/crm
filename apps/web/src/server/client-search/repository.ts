import type { DatabaseExecutor } from "~/server/platform/database/executor";
import { notify } from "~/server/platform/database/notify";
import { createJobStore } from "~/server/platform/jobs/job-store";
import { JOB_TABLE_CHANNELS } from "~/server/platform/jobs/registry";

import type {
  CompanyRegistryPort,
  EnrichmentRequest,
  RegistryRow,
} from "./ports";

const RECORD_COLUMNS = [
  "id",
  "document_type",
  "document_value",
  "full_name",
  "legal_name",
  "address",
  "district",
  "department",
  "contributor_status",
  "contributor_condition",
  "economic_activities_json",
  "payload_json",
  "source",
  "fetched_at",
  "expires_at",
  "queue_state",
  "lease_owner",
  "attempt_count",
  "max_attempts",
  "claimable_at",
  "error_message",
  "requested_by_user_id",
  "requested_at",
] as const;

// Keep the previous result visible while a new lookup is pending.
function resetPatch(values: EnrichmentRequest) {
  return {
    queue_state: "pending" as const,
    claimable_at: values.requestedAt,
    attempt_count: 0,
    max_attempts: values.maxAttempts,
    lease_owner: null,
    error_message: null,
    requested_at: values.requestedAt,
    requested_by_user_id: values.requestedByUserId,
  };
}

export function createCompanyRegistryRepo(
  db: DatabaseExecutor,
): CompanyRegistryPort {
  const store = createJobStore<RegistryRow, string>(
    db,
    "company_registry_record",
    RECORD_COLUMNS,
  );

  return {
    store,

    async upsertRequest(values) {
      const result = await db
        .insertInto("company_registry_record")
        .values({
          document_type: values.documentType,
          document_value: values.documentValue,
          ...resetPatch(values),
        })
        .onConflict((oc) =>
          oc
            .columns(["document_type", "document_value"])
            .doUpdateSet(resetPatch(values)),
        )
        .returning("id")
        .executeTakeFirstOrThrow();

      notify(db, JOB_TABLE_CHANNELS.company_registry_record);

      return result.id;
    },

    async upsertRequests(values) {
      if (values.length === 0) {
        return;
      }

      await db
        .insertInto("company_registry_record")
        .values(
          values.map((request) => ({
            document_type: request.documentType,
            document_value: request.documentValue,
            ...resetPatch(request),
          })),
        )
        .onConflict((oc) =>
          oc.columns(["document_type", "document_value"]).doUpdateSet((eb) => ({
            queue_state: "pending" as const,
            claimable_at: eb.ref("excluded.claimable_at"),
            attempt_count: 0,
            max_attempts: eb.ref("excluded.max_attempts"),
            lease_owner: null,
            error_message: null,
            requested_at: eb.ref("excluded.requested_at"),
            requested_by_user_id: eb.ref("excluded.requested_by_user_id"),
          })),
        )
        .execute();

      notify(db, JOB_TABLE_CHANNELS.company_registry_record);
    },

    async getRecord(documentType, documentValue) {
      return db
        .selectFrom("company_registry_record")
        .selectAll()
        .where("document_type", "=", documentType)
        .where("document_value", "=", documentValue)
        .executeTakeFirst();
    },
  };
}
