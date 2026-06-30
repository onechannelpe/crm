import { randomUUIDv7 } from "bun";

import { createJobStore } from "~/lib/job-queue/job-store";
import type {
  IntegrationJobRow,
  IntegrationJobType,
  NewIntegrationJob,
} from "~/server/integrations/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

const JOB_COLUMNS = [
  "id",
  "type",
  "status",
  "created_at",
  "completed_at",
  "error_message",
  "rows_total",
  "rows_applied",
  "rows_failed",
  "results_json",
  "available_at",
  "lease_owner",
  "lease_until",
  "file_path",
  "requested_by_user_id",
  "attempt_count",
  "max_attempts",
] as const;

export function createIntegrationJobRepo(
  db: DatabaseExecutor,
  now: () => number,
) {
  // `status` (PENDING|PROCESSING|COMPLETED|FAILED) stays the user-facing field
  // the import UI polls; the store owns queue_state. Both move together through
  // the domain patches below.
  const store = createJobStore<IntegrationJobRow, string>(
    db,
    "workflow_integration_jobs",
    JOB_COLUMNS,
  );

  return {
    async insert(values: NewIntegrationJob): Promise<string> {
      const id = randomUUIDv7();
      await db
        .insertInto("workflow_integration_jobs")
        .values({
          ...values,
          id,
          queue_state: "pending",
          available_at: values.created_at,
        })
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

    claimPending(
      leaseMs: number,
      workerId: string,
      batchSize: number,
      types?: IntegrationJobType[],
    ): Promise<IntegrationJobRow[]> {
      return store.claimPending(
        workerId,
        now(),
        batchSize,
        leaseMs,
        { status: "PROCESSING" },
        types && types.length > 0
          ? { column: "type", values: types }
          : undefined,
      );
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
      return store.markDone(id, {
        status: "COMPLETED",
        rows_total: result.rowsTotal,
        rows_applied: result.rowsApplied,
        rows_failed: result.rowsFailed,
        results_json: result.resultsJson,
        completed_at: now(),
      });
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

    extendLease(
      id: string,
      workerId: string,
      leaseMs: number,
    ): Promise<boolean> {
      return store.extendLease(id, workerId, leaseMs, now());
    },

    scheduleRetry(id: string, availableAt: number) {
      return store.scheduleRetry(id, availableAt, { status: "PENDING" });
    },

    markFailed(id: string, errorMessage: string) {
      return store.markFailed(id, {
        status: "FAILED",
        error_message: errorMessage,
        completed_at: now(),
      });
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
