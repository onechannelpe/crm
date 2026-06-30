import { createJobStore } from "~/lib/job-queue/job-store";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import type { EnrichmentRepositoryPort, JobRow } from "./ports";

export function createSearchEnrichmentRepo(
  db: DatabaseExecutor,
): EnrichmentRepositoryPort {
  // `status` (queued|running|succeeded|failed) stays the user-facing domain
  // field read by the status presenter; the store owns the parallel queue_state
  // lifecycle. The two move together via the domain patches below.
  const jobStore = createJobStore<JobRow, number>(
    db,
    "search_enrichment_jobs",
    [
      "id",
      "document_type",
      "document_value",
      "status",
      "queue_state",
      "requested_by_user_id",
      "requested_at",
      "completed_at",
      "lease_owner",
      "lease_until",
      "attempt_count",
      "max_attempts",
      "available_at",
      "last_error",
    ],
  );

  return {
    async upsertJob(values) {
      const result = await db
        .insertInto("search_enrichment_jobs")
        .values({
          document_type: values.document_type,
          document_value: values.document_value,
          status: "queued",
          queue_state: "pending",
          requested_by_user_id: values.requested_by_user_id,
          requested_at: values.now,
          completed_at: null,
          lease_owner: null,
          lease_until: null,
          attempt_count: 0,
          max_attempts: values.max_attempts,
          last_error: null,
          available_at: values.now,
        })
        .onConflict((oc) =>
          oc.columns(["document_type", "document_value"]).doUpdateSet({
            status: "queued",
            queue_state: "pending",
            requested_by_user_id: values.requested_by_user_id,
            requested_at: values.now,
            completed_at: null,
            lease_owner: null,
            lease_until: null,
            attempt_count: 0,
            max_attempts: values.max_attempts,
            last_error: null,
            available_at: values.now,
          }),
        )
        .returning("id")
        .executeTakeFirstOrThrow();

      return result.id;
    },

    async upsertJobs(values) {
      if (values.length === 0) return;

      await db
        .insertInto("search_enrichment_jobs")
        .values(
          values.map((job) => ({
            document_type: job.document_type,
            document_value: job.document_value,
            status: "queued" as const,
            queue_state: "pending" as const,
            requested_by_user_id: job.requested_by_user_id,
            requested_at: job.now,
            completed_at: null,
            lease_owner: null,
            lease_until: null,
            attempt_count: 0,
            max_attempts: job.max_attempts,
            last_error: null,
            available_at: job.now,
          })),
        )
        .onConflict((oc) =>
          oc.columns(["document_type", "document_value"]).doUpdateSet((eb) => ({
            status: "queued",
            queue_state: "pending",
            requested_by_user_id: eb.ref("excluded.requested_by_user_id"),
            requested_at: eb.ref("excluded.requested_at"),
            completed_at: null,
            lease_owner: null,
            lease_until: null,
            attempt_count: 0,
            max_attempts: eb.ref("excluded.max_attempts"),
            last_error: null,
            available_at: eb.ref("excluded.available_at"),
          })),
        )
        .execute();
    },

    leaseJobs: (limit, leaseMs, leaseOwner) =>
      jobStore.claimPending(leaseOwner, Date.now(), limit, leaseMs, {
        status: "running",
        last_error: null,
      }),

    extendLease: (id, workerId, leaseMs) =>
      jobStore.extendLease(id, workerId, leaseMs, Date.now()),

    // Completion spans three tables (job lifecycle, overlay upsert, writeback
    // outbox enqueue) under one transaction and only fires the overlay/outbox
    // writes if this worker still holds the lease, so it stays explicit rather
    // than routing through the store. It sets queue_state alongside the domain
    // status to keep the two in step.
    async completeJob(id, leaseOwner, overlay, now) {
      await db.transaction().execute(async (trx) => {
        const updated = await trx
          .updateTable("search_enrichment_jobs")
          .set({
            status: "succeeded",
            queue_state: "done",
            completed_at: now,
            lease_owner: null,
            lease_until: null,
            last_error: null,
          })
          .where("id", "=", id)
          .where("queue_state", "=", "processing")
          .where("lease_owner", "=", leaseOwner)
          .executeTakeFirst();

        if (Number(updated.numUpdatedRows ?? 0) === 0) {
          return;
        }

        await trx
          .insertInto("search_enrichment_overlays")
          .values(overlay)
          .onConflict((oc) =>
            oc.columns(["document_type", "document_value"]).doUpdateSet({
              full_name: overlay.full_name,
              legal_name: overlay.legal_name,
              address: overlay.address,
              district: overlay.district,
              department: overlay.department,
              contributor_status: overlay.contributor_status,
              contributor_condition: overlay.contributor_condition,
              economic_activities_json: overlay.economic_activities_json,
              source: overlay.source,
              fetched_at: overlay.fetched_at,
              expires_at: overlay.expires_at,
              payload_json: overlay.payload_json,
            }),
          )
          .execute();

        const activeOutboxEntry = await trx
          .selectFrom("search_enrichment_completion_outbox")
          .select("id")
          .where("document_type", "=", overlay.document_type)
          .where("document_value", "=", overlay.document_value)
          .where("queue_state", "in", ["pending", "processing"])
          .limit(1)
          .executeTakeFirst();

        if (activeOutboxEntry) {
          return;
        }

        await trx
          .insertInto("search_enrichment_completion_outbox")
          .values({
            document_type: overlay.document_type,
            document_value: overlay.document_value,
            legal_name: overlay.legal_name,
            address: overlay.address,
            district: overlay.district,
            department: overlay.department,
            fetched_at: overlay.fetched_at,
            queue_state: "pending",
            attempt_count: 0,
            max_attempts: 5,
            available_at: now,
            lease_owner: null,
            lease_until: null,
            error_message: null,
            created_at: now,
            processed_at: null,
          })
          .execute();
      });
    },

    failJob: (id, _leaseOwner, errorMessage, now) =>
      jobStore.markFailed(id, {
        status: "failed",
        completed_at: now,
        last_error: errorMessage,
      }),

    retryJob: (id, _leaseOwner, errorMessage, nextAttemptAt) =>
      jobStore.scheduleRetry(id, nextAttemptAt, {
        status: "queued",
        last_error: errorMessage,
      }),

    async getOverlay(documentType, documentValue) {
      return db
        .selectFrom("search_enrichment_overlays")
        .selectAll()
        .where("document_type", "=", documentType)
        .where("document_value", "=", documentValue)
        .executeTakeFirst();
    },

    async getJobStatus(documentType, documentValue) {
      return db
        .selectFrom("search_enrichment_jobs")
        .selectAll()
        .where("document_type", "=", documentType)
        .where("document_value", "=", documentValue)
        .orderBy("requested_at", "desc")
        .executeTakeFirst();
    },
  };
}
