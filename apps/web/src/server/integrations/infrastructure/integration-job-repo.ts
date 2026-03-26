import type { Insertable, Selectable } from "kysely";

import type { Database } from "~/lib/db/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

export type IntegrationJobRow = Selectable<
  Database["pipeline_integration_jobs"]
>;
export type NewIntegrationJobRow = Insertable<
  Database["pipeline_integration_jobs"]
>;

export function createIntegrationJobRepo(db: DatabaseExecutor) {
  return {
    async insert(values: NewIntegrationJobRow): Promise<number> {
      const result = await db
        .insertInto("pipeline_integration_jobs")
        .values(values)
        .executeTakeFirstOrThrow();
      return Number(result.insertId);
    },

    findById(id: number) {
      return db
        .selectFrom("pipeline_integration_jobs")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },

    list(limit: number, offset: number) {
      return db
        .selectFrom("pipeline_integration_jobs")
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
    ): Promise<IntegrationJobRow[]> {
      const now = Date.now();
      const leaseUntil = now + leaseMs;
      const pending = await db
        .selectFrom("pipeline_integration_jobs")
        .select(["id"])
        .where("status", "=", "PENDING")
        .where((eb) =>
          eb.or([eb("lease_until", "is", null), eb("lease_until", "<", now)]),
        )
        .limit(batchSize)
        .execute();

      if (pending.length === 0) return [];

      const ids = pending.map((row) => row.id);
      await db
        .updateTable("pipeline_integration_jobs")
        .set({
          status: "PROCESSING",
          lease_owner: workerId,
          lease_until: leaseUntil,
          attempt_count: 1,
        })
        .where("id", "in", ids)
        .where("status", "=", "PENDING")
        .execute();

      return db
        .selectFrom("pipeline_integration_jobs")
        .selectAll()
        .where("id", "in", ids)
        .where("status", "=", "PROCESSING")
        .where("lease_owner", "=", workerId)
        .execute();
    },

    markCompleted(
      id: number,
      result: {
        rowsTotal: number;
        rowsApplied: number;
        rowsFailed: number;
        resultsJson: string | null;
      },
    ) {
      return db
        .updateTable("pipeline_integration_jobs")
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

    markFailed(id: number, errorMessage: string) {
      return db
        .updateTable("pipeline_integration_jobs")
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

    setFilePath(id: number, filePath: string) {
      return db
        .updateTable("pipeline_integration_jobs")
        .set({ file_path: filePath })
        .where("id", "=", id)
        .execute();
    },
  };
}
