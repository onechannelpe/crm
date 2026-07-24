import type { GpvSnapshotProgressEvent } from "~/contracts/merchant-stats/imports";
import { notify } from "~/lib/db/notify";
import { GPV_SNAPSHOT_PROGRESS_CHANNEL } from "~/lib/job-queue/registry";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import type { GpvSnapshotJobRow } from "./repo";

export function buildGpvSnapshotProgressEvent(
  job: Pick<
    GpvSnapshotJobRow,
    | "id"
    | "queue_state"
    | "rows_applied"
    | "rows_failed"
    | "rows_total"
    | "error_message"
  >,
): GpvSnapshotProgressEvent {
  return {
    type: "gpv_snapshot_progress",
    jobId: job.id,
    queueState: job.queue_state,
    rowsApplied: job.rows_applied ?? 0,
    rowsFailed: job.rows_failed ?? 0,
    rowsTotal: job.rows_total ?? 0,
    errorMessage: job.error_message,
  };
}

export function publishGpvSnapshotProgress(
  db: DatabaseExecutor,
  event: GpvSnapshotProgressEvent,
): void {
  notify(db, GPV_SNAPSHOT_PROGRESS_CHANNEL, JSON.stringify(event));
}
