import type { DatabaseExecutor } from "~/server/platform/database/executor";
import { createJobQueue } from "~/server/platform/jobs/job-queue";

import {
  buildGpvSnapshotProgressEvent,
  publishGpvSnapshotProgress,
} from "./progress";
import { createGpvSnapshotJobRepo, type GpvSnapshotJobRow } from "./repo";
import { createGpvSnapshotRunner, type GpvSnapshotRunner } from "./runner";

interface GpvSnapshotQueueDeps {
  db: DatabaseExecutor;
  now: () => Date;
  readFile: (storageKey: string) => Promise<Uint8Array>;
  runner?: GpvSnapshotRunner;
}

export function createGpvSnapshotQueue(
  workerId: string,
  deps: GpvSnapshotQueueDeps,
) {
  const repo = createGpvSnapshotJobRepo(deps.db);
  const runner =
    deps.runner ??
    createGpvSnapshotRunner({
      db: deps.db,
      now: deps.now,
      readFile: deps.readFile,
      reportProgress: async (id, progress) => {
        const persisted = await repo.updateProgress(id, progress);
        publishGpvSnapshotProgress(
          deps.db,
          buildGpvSnapshotProgressEvent(persisted),
        );
      },
    });

  return createJobQueue<GpvSnapshotJobRow>({
    name: "gpv-snapshot-import",
    leaseMs: 60_000,
    now: deps.now,
    workerId,
    store: repo.store,
    handle: async (job, signal) => {
      const result = await runner.process(job, signal);

      return {
        kind: "done",
        patch: {
          rows_total: result.rowsTotal,
          rows_applied: result.rowsApplied,
          rows_failed: result.rowsFailed,
          results_json: result.resultsJson,
        },
      };
    },
    onSettled: async (job) => {
      const settled = await repo.findById(job.id);

      if (!settled) {
        return;
      }
      if (settled.queue_state === "failed") {
        await deps.db
          .updateTable("gpv_snapshots")
          .set({ state: "failed" })
          .where("id", "=", settled.snapshot_id)
          .where("state", "in", ["queued", "processing"])
          .execute();
      }

      publishGpvSnapshotProgress(
        deps.db,
        buildGpvSnapshotProgressEvent(settled),
      );
    },
  });
}
