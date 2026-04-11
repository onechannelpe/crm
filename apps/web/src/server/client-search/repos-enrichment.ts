import type { Insertable, Kysely } from "kysely";
import { sql } from "kysely";

import type {
  Database,
  SearchEnrichmentJobsTable,
  SearchEnrichmentOverlaysTable,
} from "~/lib/db/types";

type NewSearchEnrichmentJobRow = Insertable<SearchEnrichmentJobsTable>;
type NewSearchEnrichmentOverlayRow = Insertable<SearchEnrichmentOverlaysTable>;
type DocumentType = NewSearchEnrichmentJobRow["document_type"];

export function createSearchEnrichmentRepo(db: Kysely<Database>) {
  return {
    findJobByDocument(documentType: DocumentType, documentValue: string) {
      return db
        .selectFrom("search_enrichment_jobs")
        .selectAll()
        .where("document_type", "=", documentType)
        .where("document_value", "=", documentValue)
        .executeTakeFirst();
    },

    async enqueueJob(
      values: Pick<
        NewSearchEnrichmentJobRow,
        "document_type" | "document_value" | "requested_by_user_id"
      > & { now: number; max_attempts: number },
    ): Promise<number> {
      const existing = await this.findJobByDocument(
        values.document_type,
        values.document_value,
      );
      if (
        existing &&
        (existing.status === "queued" || existing.status === "running")
      ) {
        return existing.id;
      }

      if (existing) {
        await db
          .updateTable("search_enrichment_jobs")
          .set({
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
          })
          .where("id", "=", existing.id)
          .execute();
        return existing.id;
      }

      const inserted = await db
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
        })
        .executeTakeFirstOrThrow();

      return Number(inserted.insertId);
    },

    async leaseJobs(limit: number, leaseMs: number, leaseOwner: string) {
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

    markJobCompleted(id: number, leaseOwner: string, now: number) {
      return db
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
    },

    async extendLease(
      id: number,
      workerId: string,
      leaseMs: number,
    ): Promise<boolean> {
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

    scheduleRetry(id: number, availableAt: number) {
      return db
        .updateTable("search_enrichment_jobs")
        .set({
          status: "queued",
          available_at: availableAt,
          lease_owner: null,
          lease_until: null,
        })
        .where("id", "=", id)
        .execute();
    },

    markJobFailed(
      id: number,
      leaseOwner: string,
      errorMessage: string,
      now: number,
    ) {
      return db
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

    getOverlay(documentType: DocumentType, documentValue: string, now: number) {
      return db
        .selectFrom("search_enrichment_overlays")
        .selectAll()
        .where("document_type", "=", documentType)
        .where("document_value", "=", documentValue)
        .where("expires_at", ">", now)
        .executeTakeFirst();
    },

    upsertOverlay(values: NewSearchEnrichmentOverlayRow) {
      return db
        .insertInto("search_enrichment_overlays")
        .values(values)
        .onConflict((oc) =>
          oc.columns(["document_type", "document_value"]).doUpdateSet({
            full_name: values.full_name,
            legal_name: values.legal_name,
            address: values.address,
            district: values.district,
            department: values.department,
            contributor_status: values.contributor_status,
            contributor_condition: values.contributor_condition,
            source: values.source,
            fetched_at: values.fetched_at,
            expires_at: values.expires_at,
            payload_json: values.payload_json,
          }),
        )
        .execute();
    },
  };
}
