import type { Kysely } from "kysely";

import type { Database, NewIntegrationJob } from "~/lib/db/types";

export function createIntegrationJobsRepo(db: Kysely<Database>) {
  return {
    async create(values: NewIntegrationJob): Promise<number> {
      const result = await db
        .insertInto("crm_integration_jobs")
        .values(values)
        .executeTakeFirstOrThrow();
      return Number(result.insertId);
    },

    findById(id: number) {
      return db
        .selectFrom("crm_integration_jobs")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },

    list(limit: number, offset: number) {
      return db
        .selectFrom("crm_integration_jobs")
        .selectAll()
        .orderBy("created_at", "desc")
        .limit(limit)
        .offset(offset)
        .execute();
    },

    async claimPending(
      leaseMs: number,
      workerId: string,
      batchSize: number,
    ): Promise<number[]> {
      const now = Date.now();
      const leaseUntil = now + leaseMs;
      const rows = await db
        .selectFrom("crm_integration_jobs")
        .select("id")
        .where("status", "=", "PENDING")
        .where((eb) =>
          eb.or([eb("lease_until", "is", null), eb("lease_until", "<", now)]),
        )
        .limit(batchSize)
        .execute();
      if (rows.length === 0) return [];
      const ids = rows.map((r) => r.id);
      await db
        .updateTable("crm_integration_jobs")
        .set({
          status: "PROCESSING",
          lease_owner: workerId,
          lease_until: leaseUntil,
        })
        .where("id", "in", ids)
        .where("status", "=", "PENDING")
        .execute();
      return ids;
    },

    async markCompleted(
      id: number,
      result: {
        rowsTotal: number;
        rowsApplied: number;
        rowsFailed: number;
        resultsJson: string | null;
      },
    ): Promise<void> {
      await db
        .updateTable("crm_integration_jobs")
        .set({
          status: "COMPLETED",
          rows_total: result.rowsTotal,
          rows_applied: result.rowsApplied,
          rows_failed: result.rowsFailed,
          results_json: result.resultsJson,
          completed_at: Date.now(),
          lease_owner: null,
          lease_until: null,
        })
        .where("id", "=", id)
        .execute();
    },

    async markFailed(id: number, errorMessage: string): Promise<void> {
      await db
        .updateTable("crm_integration_jobs")
        .set({
          status: "FAILED",
          error_message: errorMessage,
          completed_at: Date.now(),
          lease_owner: null,
          lease_until: null,
        })
        .where("id", "=", id)
        .execute();
    },

    async setFilePath(id: number, filePath: string): Promise<void> {
      await db
        .updateTable("crm_integration_jobs")
        .set({ file_path: filePath })
        .where("id", "=", id)
        .execute();
    },
  };
}
