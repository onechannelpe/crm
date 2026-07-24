import type { GpvSnapshotState } from "~/lib/db/schema/modules/merchant-stats.types";
import { isQueueState, type QueueState } from "~/lib/job-queue/queue-state";
import { defineTopic } from "~/lib/realtime/topic";

export interface GpvSnapshotProgressEvent {
  type: "gpv_snapshot_progress";
  jobId: string;
  queueState: QueueState;
  rowsApplied: number;
  rowsFailed: number;
  rowsTotal: number;
  errorMessage: string | null;
}

export interface GpvSnapshotView {
  snapshotId: string;
  state: GpvSnapshotState;
  cutAt: string;
  job: GpvSnapshotProgressEvent | null;
  issues: Array<{
    id: string;
    type: string;
    detail: string;
    entityKey: string | null;
  }>;
}

export const gpvSnapshotTopic = defineTopic("gpv.snapshot.import");

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isGpvSnapshotProgressEvent(
  value: unknown,
): value is GpvSnapshotProgressEvent {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    value.type === "gpv_snapshot_progress" &&
    typeof value.jobId === "string" &&
    isQueueState(value.queueState) &&
    typeof value.rowsApplied === "number" &&
    typeof value.rowsFailed === "number" &&
    typeof value.rowsTotal === "number" &&
    (typeof value.errorMessage === "string" || value.errorMessage === null)
  );
}

export function parseGpvSnapshotProgressMessage(
  raw: string,
): GpvSnapshotProgressEvent | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  return isGpvSnapshotProgressEvent(parsed) ? parsed : null;
}
