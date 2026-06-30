import { notify } from "~/lib/db/notify";
import { createJobStore } from "~/lib/job-queue/job-store";
import { JOB_TABLE_CHANNELS } from "~/lib/job-queue/registry";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import type { EnrichmentRepositoryPort, JobRow } from "./ports";

export function createSearchEnrichmentRepo(
  db: DatabaseExecutor,
): EnrichmentRepositoryPort {
  // The user-facing `status` (queued|running|succeeded|failed) mirrors the
  // canonical queue_state 1:1; the store keeps them in lockstep through this
  // lifecycle map, and stamps `completed_at`/`last_error` on settle.
  const store = createJobStore<JobRow, string>(
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
    {
      finishedAt: "completed_at",
      error: "last_error",
      status: {
        column: "status",
        pending: "queued",
        processing: "running",
        done: "succeeded",
        failed: "failed",
      },
    },
  );

  return {
    store,
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

      // Wake the enrichment queue on the same executor the job was written on, so
      // a registration transaction buffers the NOTIFY until commit.
      notify(db, JOB_TABLE_CHANNELS.search_enrichment_jobs);
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

      notify(db, JOB_TABLE_CHANNELS.search_enrichment_jobs);
    },

    // The overlay upsert and writeback-outbox enqueue run in one transaction so
    // a worker that wrote the overlay always leaves a wake-up for the writeback
    // queue. Both writes are idempotent (overlay onConflict upsert, outbox
    // active-row guard), so re-running after a reaped lease is safe; the job
    // row's queue transition is settled separately by the queue.
    async recordCompletion(overlay, now) {
      await db.transaction().execute(async (trx) => {
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

        // Wake the writeback queue from inside the same transaction: the NOTIFY
        // is buffered until commit, so the consumer never wakes for an outbox row
        // that has not landed.
        notify(trx, JOB_TABLE_CHANNELS.search_enrichment_completion_outbox);
      });
    },

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
