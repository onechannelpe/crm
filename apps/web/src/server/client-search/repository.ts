import type { Kysely } from "kysely";
import { sql } from "kysely";

import type { Database } from "~/lib/db/types";
import type { EnrichmentRepositoryPort } from "~/server/client-search/ports";

export function createSearchEnrichmentRepo(
  db: Kysely<Database>,
): EnrichmentRepositoryPort {
  return {
    async upsertJob(values) {
      // Atomic upsert: if (doc_type, doc_value) exists, keep old ID but reset status to queued
      // This is idempotent and race-safe
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
          available_at: null,
        })
        .onConflict((oc) =>
          oc.columns(["document_type", "document_value"]).doUpdateSet({
            status: "queued",
            requested_by_user_id: values.requested_by_user_id,
            requested_at: values.now,
            completed_at: null,
            available_at: null,
            lease_owner: null,
            lease_until: null,
            attempt_count: 0,
            max_attempts: values.max_attempts,
            last_error: null,
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
            eb.or([
              eb("available_at", "is", null),
              eb("available_at", "<=", now),
            ]),
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
                eb.or([
                  eb("available_at", "is", null),
                  eb("available_at", "<=", now),
                ]),
                eb.or([
                  eb("lease_until", "is", null),
                  eb("lease_until", "<", now),
                ]),
              ]),
            )
            .executeTakeFirst();
          if (Number(updated.numUpdatedRows ?? 0) === 0) return null;
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
      await db
        .updateTable("search_enrichment_jobs")
        .set({
          status: "completed",
          completed_at: now,
          lease_owner: null,
          lease_until: null,
          last_error: null,
        })
        .where("id", "=", id)
        .where("status", "=", "running")
        .where("lease_owner", "=", leaseOwner)
        .execute();

      // Upsert overlay
      await db
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
    },

    async failJobTerminal(id, leaseOwner, errorMessage, now) {
      await db
        .updateTable("search_enrichment_jobs")
        .set({
          status: "failed_terminal",
          completed_at: now,
          lease_owner: null,
          lease_until: null,
          last_error: errorMessage,
        })
        .where("id", "=", id)
        .where("lease_owner", "=", leaseOwner)
        .execute();
    },

    async failJobRetryable(id, leaseOwner, errorMessage, nextAvailableAt) {
      await db
        .updateTable("search_enrichment_jobs")
        .set({
          status: "queued",
          available_at: nextAvailableAt,
          lease_owner: null,
          lease_until: null,
          last_error: errorMessage,
        })
        .where("id", "=", id)
        .where("lease_owner", "=", leaseOwner)
        .execute();
    },

    async getOverlay(documentType, documentValue, now) {
      return db
        .selectFrom("search_enrichment_overlays")
        .selectAll()
        .where("document_type", "=", documentType)
        .where("document_value", "=", documentValue)
        .where("expires_at", ">", now)
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
