import { randomUUIDv7 } from "bun";

import { notify } from "~/lib/db/notify";
import { createJobStore } from "~/lib/job-queue/job-store";
import { JOB_TABLE_CHANNELS } from "~/lib/job-queue/registry";
import type {
  IntegrationJobRow,
  IntegrationJobsPort,
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
): IntegrationJobsPort {
  // `status` (PENDING|PROCESSING|COMPLETED|FAILED) is the field the import UI
  // polls; it mirrors queue_state 1:1, so the store keeps the two in lockstep
  // through this lifecycle map and stamps completed_at/error_message on settle.
  const store = createJobStore<IntegrationJobRow, string>(
    db,
    "workflow_integration_jobs",
    JOB_COLUMNS,
    {
      finishedAt: "completed_at",
      error: "error_message",
      status: {
        column: "status",
        pending: "PENDING",
        processing: "PROCESSING",
        done: "COMPLETED",
        failed: "FAILED",
      },
    },
  );

  return {
    store,
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

      // Wake the records-import queue on the same executor the job was written
      // on, so a wrapping transaction buffers the NOTIFY until commit.
      notify(db, JOB_TABLE_CHANNELS.workflow_integration_jobs);
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

    setFilePath(id: string, filePath: string) {
      return db
        .updateTable("workflow_integration_jobs")
        .set({ file_path: filePath })
        .where("id", "=", id)
        .execute();
    },
  };
}
