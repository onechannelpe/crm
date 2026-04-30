import { randomUUIDv7 } from "bun";

import type {
  IntegrationJobRow,
  IntegrationJobType,
  NewIntegrationJob,
} from "~/server/integrations/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

export function createIntegrationJobRepo(db: DatabaseExecutor) {
  return {
    async insert(values: NewIntegrationJob): Promise<string> {
      const id = randomUUIDv7();
      await db
        .insertInto("workflow_integration_jobs")
        .values({ ...values, id })
        .executeTakeFirstOrThrow();
      return id;
    },

    findById(id: string) {
      return db
        .selectFrom("workflow_integration_jobs")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },

    list(limit: number, offset: number) {
      return db
        .selectFrom("workflow_integration_jobs")
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
      types?: IntegrationJobType[],
    ): Promise<IntegrationJobRow[]> {
      const now = Date.now();
      const leaseUntil = now + leaseMs;

      let query = db
        .selectFrom("workflow_integration_jobs")
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
        .updateTable("workflow_integration_jobs")
        .set((eb) => ({
          status: "PROCESSING",
          lease_owner: workerId,
          lease_until: leaseUntil,
          attempt_count: eb("attempt_count", "+", 1),
        }))
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

        .selectFrom("workflow_integration_jobs")
        .selectAll()
        .where("id", "in", ids)
        .where("status", "=", "PROCESSING")
        .where("lease_owner", "=", workerId)
        .execute();
    },

    markCompleted(
      id: string,
      result: {
        rowsTotal: number;
        rowsApplied: number;
        rowsFailed: number;
        resultsJson: string | null;
      },
    ) {
      return db
        .updateTable("workflow_integration_jobs")
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

    updateProgress(
      id: string,
      progress: {
        rowsTotal?: number;
        rowsApplied?: number;
        rowsFailed?: number;
      },
    ) {
      const values: {
        rows_total?: number;
        rows_applied?: number;
        rows_failed?: number;
      } = {};
      if (progress.rowsTotal !== undefined) {
        values.rows_total = progress.rowsTotal;
      }
      if (progress.rowsApplied !== undefined) {
        values.rows_applied = progress.rowsApplied;
      }
      if (progress.rowsFailed !== undefined) {
        values.rows_failed = progress.rowsFailed;
      }

      if (Object.keys(values).length === 0) {
        return Promise.resolve();
      }

      return db
        .updateTable("workflow_integration_jobs")
        .set(values)
        .where("id", "=", id)
        .execute();
    },

    async extendLease(
      id: string,
      workerId: string,
      leaseMs: number,
    ): Promise<boolean> {
      const now = Date.now();
      const result = await db
        .updateTable("workflow_integration_jobs")
        .set({ lease_until: now + leaseMs })
        .where("id", "=", id)
        .where("lease_owner", "=", workerId)
        .where("status", "=", "PROCESSING")
        .executeTakeFirst();

      return Number(result.numUpdatedRows ?? 0) > 0;
    },

    scheduleRetry(id: string, availableAt: number) {
      return db
        .updateTable("workflow_integration_jobs")
        .set({
          status: "PENDING",
          available_at: availableAt,
          lease_owner: null,
          lease_until: null,
        })
        .where("id", "=", id)
        .execute();
    },

    markFailed(id: string, errorMessage: string) {
      return db
        .updateTable("workflow_integration_jobs")
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

    setFilePath(id: string, filePath: string) {
      return db
        .updateTable("workflow_integration_jobs")
        .set({ file_path: filePath })
        .where("id", "=", id)
        .execute();
    },
  };
}
