import { notify } from "~/lib/db/notify";
import { createJobStore } from "~/lib/job-queue/job-store";
import { JOB_TABLE_CHANNELS } from "~/lib/job-queue/registry";
import type {
  IntegrationJobRow,
  IntegrationJobsPort,
  NewIntegrationJob,
} from "~/server/integrations/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { IntegrationJobId } from "~/server/shared/ids";

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

    async insert(values: NewIntegrationJob): Promise<IntegrationJobRow["id"]> {
      const row = await db
        .insertInto("workflow_integration_jobs")
        .values({
          ...values,
          queue_state: "pending",
          claimable_at: values.created_at,
        })
        .returning("id")
        .executeTakeFirstOrThrow();

      notify(db, JOB_TABLE_CHANNELS.workflow_integration_jobs);

      return row.id;
    },

    findById(id: IntegrationJobId) {
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
      id: IntegrationJobId,
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

      let hasUpdates = false;

      if (progress.rowsTotal !== undefined) {
        values.rows_total = progress.rowsTotal;
        hasUpdates = true;
      }

      if (progress.rowsApplied !== undefined) {
        values.rows_applied = progress.rowsApplied;
        hasUpdates = true;
      }

      if (progress.rowsFailed !== undefined) {
        values.rows_failed = progress.rowsFailed;
        hasUpdates = true;
      }

      if (!hasUpdates) {
        return Promise.resolve();
      }

      return db
        .updateTable("workflow_integration_jobs")
        .set(values)
        .where("id", "=", id)
        .execute();
    },

    setFilePath(id: IntegrationJobId, filePath: string) {
      return db
        .updateTable("workflow_integration_jobs")
        .set({ file_path: filePath })
        .where("id", "=", id)
        .execute();
    },
  };
}
