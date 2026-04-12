import { sql } from "kysely";

import type { DatabaseExecutor } from "~/server/shared/db-executor";

import type { EnrichmentRepositoryPort } from "./ports";

export function createSearchEnrichmentRepo(
  db: DatabaseExecutor,
): EnrichmentRepositoryPort {
  return {
    async upsertJob(values) {
      const result = await db
        .insertInto("search_enrichment_jobs")
        .values({
          document_type: values.document_type,
          document_value: values.document_value,
          status: "queued",
          requested_by_user_id: values.requested_by_user_id,
          requested_at: values.now,
          completed_at: null,
          lease_owner: null,
          lease_until: null,
          attempt_count: 0,
          max_attempts: values.max_attempts,
          last_error: null,
          next_attempt_at: values.now,
        })
        .onConflict((oc) =>
          oc.columns(["document_type", "document_value"]).doUpdateSet({
            status: "queued",
            requested_by_user_id: values.requested_by_user_id,
            requested_at: values.now,
            completed_at: null,
            lease_owner: null,
            lease_until: null,
            attempt_count: 0,
            max_attempts: values.max_attempts,
            last_error: null,
            next_attempt_at: values.now,
          }),
        )
        .returning("id")
        .executeTakeFirstOrThrow();

      return result.id;
    },

    async leaseJobs(limit, leaseMs, leaseOwner) {
      const now = Date.now();
      const leaseUntil = now + leaseMs;
      const candidates = await db
        .selectFrom("search_enrichment_jobs")
        .select(["id"])
        .where((eb) =>
          eb.and([
            eb("status", "=", "queued"),
            eb("next_attempt_at", "<=", now),
            eb.or([eb("lease_until", "is", null), eb("lease_until", "<", now)]),
          ]),
        )
        .orderBy("requested_at", "asc")
        .limit(limit)
        .execute();

      const leased = await Promise.all(
        candidates.map(async ({ id }) => {
          const updated = await db
            .updateTable("search_enrichment_jobs")
            .set({
              status: "running",
              lease_owner: leaseOwner,
              lease_until: leaseUntil,
              last_error: null,
              attempt_count: sql<number>`attempt_count + 1`,
            })
            .where("id", "=", id)
            .where((eb) =>
              eb.and([
                eb("status", "=", "queued"),
                eb("next_attempt_at", "<=", now),
                eb.or([
                  eb("lease_until", "is", null),
                  eb("lease_until", "<", now),
                ]),
              ]),
            )
            .executeTakeFirst();

          if (Number(updated.numUpdatedRows ?? 0) === 0) {
            return null;
          }

          return db
            .selectFrom("search_enrichment_jobs")
            .selectAll()
            .where("id", "=", id)
            .where("status", "=", "running")
            .where("lease_owner", "=", leaseOwner)
            .executeTakeFirst();
        }),
      );

      return leased.filter(
        (job): job is NonNullable<(typeof leased)[number]> => job !== null,
      );
    },

    async extendLease(id, workerId, leaseMs) {
      const now = Date.now();
      const result = await db
        .updateTable("search_enrichment_jobs")
        .set({ lease_until: now + leaseMs })
        .where("id", "=", id)
        .where("lease_owner", "=", workerId)
        .where("status", "=", "running")
        .executeTakeFirst();

      return Number(result.numUpdatedRows ?? 0) > 0;
    },

    async completeJob(id, leaseOwner, overlay, now) {
      await db.transaction().execute(async (trx) => {
        const updated = await trx
          .updateTable("search_enrichment_jobs")
          .set({
            status: "succeeded",
            completed_at: now,
            lease_owner: null,
            lease_until: null,
            last_error: null,
          })
          .where("id", "=", id)
          .where("status", "=", "running")
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
              source: overlay.source,
              fetched_at: overlay.fetched_at,
              expires_at: overlay.expires_at,
              payload_json: overlay.payload_json,
            }),
          )
          .execute();
      });
    },

    async failJob(id, leaseOwner, errorMessage, now) {
      await db
        .updateTable("search_enrichment_jobs")
        .set({
          status: "failed",
          completed_at: now,
          lease_owner: null,
          lease_until: null,
          last_error: errorMessage,
        })
        .where("id", "=", id)
        .where("lease_owner", "=", leaseOwner)
        .execute();
    },

    async retryJob(id, leaseOwner, errorMessage, nextAttemptAt) {
      await db
        .updateTable("search_enrichment_jobs")
        .set({
          status: "queued",
          next_attempt_at: nextAttemptAt,
          lease_owner: null,
          lease_until: null,
          last_error: errorMessage,
        })
        .where("id", "=", id)
        .where("lease_owner", "=", leaseOwner)
        .execute();
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
