import { sql, type Insertable, type Selectable } from "kysely";

import type { Database, PipelineIntegrationJobsTable } from "~/lib/db/types";
import { createLogger } from "~/lib/observability/logger";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

export type IntegrationJobRow = Selectable<
  Database["pipeline_integration_jobs"]
>;
export type NewIntegrationJobRow = Insertable<
  Database["pipeline_integration_jobs"]
>;

const logger = createLogger("integration-job-repo");

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
      types?: Array<PipelineIntegrationJobsTable["type"]>,
    ): Promise<IntegrationJobRow[]> {
      const now = Date.now();
      const leaseUntil = now + leaseMs;

      let query = db
        .selectFrom("pipeline_integration_jobs")
        .select(["id", "status", "lease_until"])
        .where((eb) =>
          eb.and([
            eb("status", "=", "PENDING"),
            eb.or([
              eb("available_at", "is", null),
              eb("available_at", "<=", now),
            ]),
            eb.or([eb("lease_until", "is", null), eb("lease_until", "<", now)]),
          ]),
        );

      if (types && types.length > 0) {
        query = query.where("type", "in", types);
      }

      const candidates = await query
        .orderBy("created_at", "asc")
        .limit(batchSize)
        .execute();

      if (candidates.length === 0) return [];

      const ids = candidates.map((row) => row.id);
      let updateQuery = db
        .updateTable("pipeline_integration_jobs")
        .set({
          status: "PROCESSING",
          lease_owner: workerId,
          lease_until: leaseUntil,
          attempt_count: sql<number>`attempt_count + 1`,
        })
        .where("id", "in", ids)
        .where((eb) =>
          eb.and([
            eb("status", "=", "PENDING"),
            eb.or([
              eb("available_at", "is", null),
              eb("available_at", "<=", now),
            ]),
            eb.or([eb("lease_until", "is", null), eb("lease_until", "<", now)]),
          ]),
        );

      if (types && types.length > 0) {
        updateQuery = updateQuery.where("type", "in", types);
      }

      await updateQuery.execute();

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

    async extendLease(
      id: number,
      workerId: string,
      leaseMs: number,
    ): Promise<boolean> {
      const now = Date.now();
      const result = await db
        .updateTable("pipeline_integration_jobs")
        .set({ lease_until: now + leaseMs })
        .where("id", "=", id)
        .where("lease_owner", "=", workerId)
        .where("status", "=", "PROCESSING")
        .executeTakeFirst();

      return Number(result.numUpdatedRows ?? 0) > 0;
    },

    scheduleRetry(id: number, availableAt: number) {
      return db
        .updateTable("pipeline_integration_jobs")
        .set({
          status: "PENDING",
          available_at: availableAt,
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
