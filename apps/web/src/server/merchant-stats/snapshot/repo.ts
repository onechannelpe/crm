import type { Selectable } from "kysely";

import type { GpvSnapshotId, GpvSnapshotJobId } from "~/domain/ids";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import { notify } from "~/server/platform/database/notify";
import type { GpvSnapshotJobsTable } from "~/server/platform/database/schema/modules/merchant-stats.types";
import { createJobStore } from "~/server/platform/jobs/job-store";
import { JOB_TABLE_CHANNELS } from "~/server/platform/jobs/registry";

export type GpvSnapshotJobRow = Selectable<GpvSnapshotJobsTable>;

const JOB_COLUMNS = [
  "id",
  "snapshot_id",
  "queue_state",
  "rows_total",
  "rows_applied",
  "rows_failed",
  "results_json",
  "error_message",
  "claimable_at",
  "lease_owner",
  "attempt_count",
  "max_attempts",
  "created_at",
  "completed_at",
] as const;

export function createGpvSnapshotJobRepo(db: DatabaseExecutor) {
  const store = createJobStore<GpvSnapshotJobRow, GpvSnapshotJobId>(
    db,
    "gpv_snapshot_jobs",
    JOB_COLUMNS,
  );

  return {
    store,

    async insert(input: {
      snapshotId: GpvSnapshotId;
      maxAttempts: number;
      now: Date;
    }): Promise<GpvSnapshotJobId> {
      const row = await db
        .insertInto("gpv_snapshot_jobs")
        .values({
          snapshot_id: input.snapshotId,
          max_attempts: input.maxAttempts,
          claimable_at: input.now,
          created_at: input.now,
        })
        .returning("id")
        .executeTakeFirstOrThrow();

      notify(db, JOB_TABLE_CHANNELS.gpv_snapshot_jobs);

      return row.id;
    },

    findById(id: GpvSnapshotJobId) {
      return db
        .selectFrom("gpv_snapshot_jobs")
        .selectAll()
        .where("id", "=", id)
        .executeTakeFirst();
    },

    updateProgress(
      id: GpvSnapshotJobId,
      progress: { rowsTotal: number; rowsApplied: number; rowsFailed: number },
    ): Promise<GpvSnapshotJobRow> {
      return db
        .updateTable("gpv_snapshot_jobs")
        .set({
          rows_total: progress.rowsTotal,
          rows_applied: progress.rowsApplied,
          rows_failed: progress.rowsFailed,
        })
        .where("id", "=", id)
        .returningAll()
        .executeTakeFirstOrThrow();
    },
  };
}
