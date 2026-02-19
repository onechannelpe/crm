import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/schema";

const DEFAULT_MAX_ATTEMPTS = 8;
const RETRY_BACKOFF_MS = 30_000;

export function createDocumentJobsRepo(db: Kysely<Database>) {
  return {
    enqueuePersistUpload(values: {
      document_id: number;
      blob_sha256: string;
      storage_key: string;
      payload_bytes: Uint8Array;
    }) {
      const now = Date.now();
      return db
        .insertInto("sales_document_jobs")
        .values({
          document_id: values.document_id,
          blob_sha256: values.blob_sha256,
          storage_key: values.storage_key,
          operation: "persist_upload",
          payload_bytes: values.payload_bytes,
          status: "pending",
          attempt_count: 0,
          max_attempts: DEFAULT_MAX_ATTEMPTS,
          available_at: now,
          lease_until: null,
          last_error: null,
          created_at: now,
          updated_at: now,
        })
        .executeTakeFirstOrThrow();
    },

    enqueueDeleteBlob(values: { blob_sha256: string; storage_key: string }) {
      const now = Date.now();
      return db
        .insertInto("sales_document_jobs")
        .values({
          document_id: null,
          blob_sha256: values.blob_sha256,
          storage_key: values.storage_key,
          operation: "delete_blob",
          payload_bytes: null,
          status: "pending",
          attempt_count: 0,
          max_attempts: DEFAULT_MAX_ATTEMPTS,
          available_at: now,
          lease_until: null,
          last_error: null,
          created_at: now,
          updated_at: now,
        })
        .executeTakeFirstOrThrow();
    },

    async leasePending(limit: number, leaseMs: number) {
      const now = Date.now();
      const leaseUntil = now + leaseMs;

      const pending = await db
        .selectFrom("sales_document_jobs")
        .selectAll()
        .where((eb) =>
          eb.or([
            eb("status", "=", "pending"),
            eb.and([
              eb("status", "=", "leased"),
              eb("lease_until", "is not", null),
              eb("lease_until", "<", now),
            ]),
          ]),
        )
        .where("available_at", "<=", now)
        .orderBy("available_at", "asc")
        .limit(limit)
        .execute();

      const leased = await Promise.all(
        pending.map(async (job) => {
          const updated = await db
            .updateTable("sales_document_jobs")
            .set({
              status: "leased",
              lease_until: leaseUntil,
              updated_at: now,
            })
            .where("id", "=", job.id)
            .where("updated_at", "=", job.updated_at)
            .executeTakeFirst();
          if (Number(updated.numUpdatedRows ?? 0) < 1) {
            return null;
          }
          return {
            ...job,
            status: "leased" as const,
            lease_until: leaseUntil,
            updated_at: now,
          };
        }),
      );

      return leased.filter(
        (job): job is NonNullable<typeof job> => job !== null,
      );
    },

    markCompleted(jobId: number) {
      const now = Date.now();
      return db
        .updateTable("sales_document_jobs")
        .set({
          status: "completed",
          lease_until: null,
          updated_at: now,
        })
        .where("id", "=", jobId)
        .executeTakeFirstOrThrow();
    },

    async markFailedOrRetry(jobId: number, message: string) {
      const now = Date.now();
      const existing = await db
        .selectFrom("sales_document_jobs")
        .select(["id", "attempt_count", "max_attempts"])
        .where("id", "=", jobId)
        .executeTakeFirst();
      if (!existing) {
        return;
      }

      const attempts = existing.attempt_count + 1;
      const exhausted = attempts >= existing.max_attempts;
      await db
        .updateTable("sales_document_jobs")
        .set({
          status: exhausted ? "failed" : "pending",
          attempt_count: attempts,
          available_at: exhausted ? now : now + RETRY_BACKOFF_MS,
          lease_until: null,
          last_error: message,
          updated_at: now,
        })
        .where("id", "=", jobId)
        .executeTakeFirstOrThrow();
    },
  };
}
