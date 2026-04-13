import { sql } from "kysely";

import type { DatabaseExecutor } from "~/server/shared/db-executor";

export function createSunatEnrichmentWritebackOutboxRepo(
  executor: DatabaseExecutor,
) {
  return {
    async claimQueued(workerId: string, limit: number, leaseMs: number) {
      const now = Date.now();
      const leaseUntil = now + leaseMs;

      const candidates = await executor
        .selectFrom("search_enrichment_completion_outbox")
        .select("id")
        .where("status", "=", "queued")
        .where("available_at", "<=", now)
        .where((eb) =>
          eb.or([eb("lease_until", "is", null), eb("lease_until", "<", now)]),
        )
        .orderBy("created_at", "asc")
        .limit(limit)
        .execute();

      if (candidates.length < 1) {
        return [];
      }

      const ids = candidates.map((row) => row.id);
      await executor
        .updateTable("search_enrichment_completion_outbox")
        .set({
          status: "running",
          lease_owner: workerId,
          lease_until: leaseUntil,
          attempt_count: sql<number>`attempt_count + 1`,
        })
        .where("id", "in", ids)
        .where("status", "=", "queued")
        .where("available_at", "<=", now)
        .where((eb) =>
          eb.or([eb("lease_until", "is", null), eb("lease_until", "<", now)]),
        )
        .execute();

      return executor
        .selectFrom("search_enrichment_completion_outbox")
        .selectAll()
        .where("id", "in", ids)
        .where("status", "=", "running")
        .where("lease_owner", "=", workerId)
        .execute();
    },

    async extendLease(id: number, workerId: string, leaseMs: number) {
      const now = Date.now();
      const result = await executor
        .updateTable("search_enrichment_completion_outbox")
        .set({ lease_until: now + leaseMs })
        .where("id", "=", id)
        .where("status", "=", "running")
        .where("lease_owner", "=", workerId)
        .executeTakeFirst();

      return Number(result.numUpdatedRows ?? 0) > 0;
    },

    async markCompleted(id: number, workerId: string) {
      await executor
        .updateTable("search_enrichment_completion_outbox")
        .set({
          status: "completed",
          processed_at: Date.now(),
          lease_owner: null,
          lease_until: null,
          error_message: null,
        })
        .where("id", "=", id)
        .where("status", "=", "running")
        .where("lease_owner", "=", workerId)
        .execute();
    },

    async scheduleRetry(id: number, availableAt: number, workerId: string) {
      await executor
        .updateTable("search_enrichment_completion_outbox")
        .set({
          status: "queued",
          available_at: availableAt,
          lease_owner: null,
          lease_until: null,
        })
        .where("id", "=", id)
        .where("status", "=", "running")
        .where("lease_owner", "=", workerId)
        .execute();
    },

    async markFailed(id: number, reason: string, workerId: string) {
      await executor
        .updateTable("search_enrichment_completion_outbox")
        .set({
          status: "failed",
          processed_at: Date.now(),
          error_message: reason,
          lease_owner: null,
          lease_until: null,
        })
        .where("id", "=", id)
        .where("status", "=", "running")
        .where("lease_owner", "=", workerId)
        .execute();
    },
  };
}

export type SunatEnrichmentWritebackOutboxRepo = ReturnType<
  typeof createSunatEnrichmentWritebackOutboxRepo
>;
