import type { IntegrationJobId } from "~/domain/ids";
import type {
  IntegrationJobRow,
  IntegrationJobsPort,
  NewIntegrationJob,
} from "~/server/integrations/types";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import { notify } from "~/server/platform/database/notify";
import { createJobStore } from "~/server/platform/jobs/job-store";
import { JOB_TABLE_CHANNELS } from "~/server/platform/jobs/registry";

const JOB_COLUMNS = [
  "id",
  "type",
  "queue_state",
  "created_at",
  "completed_at",
  "error_message",
  "rows_total",
  "rows_applied",
  "rows_failed",
  "results_json",
  "claimable_at",
  "lease_owner",
  "file_path",
  "requested_by_user_id",
  "attempt_count",
  "max_attempts",
] as const;

export function createIntegrationJobRepo(
  db: DatabaseExecutor,
): IntegrationJobsPort {
  const store = createJobStore<IntegrationJobRow, IntegrationJobRow["id"]>(
    db,
    "workflow_integration_jobs",
    JOB_COLUMNS,
  );

  return {
    store,

    async insert(values: NewIntegrationJob): Promise<IntegrationJobRow> {
      const row = await db
        .insertInto("workflow_integration_jobs")
        .values({
          ...values,
          queue_state: "pending",
          claimable_at: values.created_at,
        })
        .returning(JOB_COLUMNS)
        .executeTakeFirstOrThrow();

      notify(db, JOB_TABLE_CHANNELS.workflow_integration_jobs);

      return row;
    },

    findById(id: IntegrationJobId) {
      return db
        .selectFrom("workflow_integration_jobs")
        .select(JOB_COLUMNS)
        .where("id", "=", id)
        .executeTakeFirst();
    },

    list(limit: number, offset: number) {
      return db
        .selectFrom("workflow_integration_jobs")
        .select(JOB_COLUMNS)
        .orderBy("created_at", "desc")
        .limit(limit)
        .offset(offset)
        .execute();
    },

    updateProgress(
      id: IntegrationJobId,
      progress: {
        rowsTotal: number;
        rowsApplied: number;
        rowsFailed: number;
      },
    ) {
      return db
        .updateTable("workflow_integration_jobs")
        .set({
          rows_total: progress.rowsTotal,
          rows_applied: progress.rowsApplied,
          rows_failed: progress.rowsFailed,
        })
        .where("id", "=", id)
        .returning(JOB_COLUMNS)
        .executeTakeFirstOrThrow();
    },

    async setFilePath(id: IntegrationJobId, filePath: string): Promise<void> {
      const result = await db
        .updateTable("workflow_integration_jobs")
        .set({ file_path: filePath })
        .where("id", "=", id)
        .executeTakeFirst();

      if (result.numUpdatedRows !== 1n) {
        throw new Error(`integration job '${id}' was not found`);
      }
    },
  };
}
