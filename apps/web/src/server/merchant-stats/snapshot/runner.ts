import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { GpvSnapshotJobId } from "~/server/shared/ids";
import { isErr } from "~/server/shared/result";

import { parseReport } from "../intake/parse-report";
import { activateGpvSnapshot } from "./activate";
import type { GpvSnapshotJobRow } from "./repo";
import { stageGpvSnapshot } from "./stage";
import { validateGpvSnapshot } from "./validate";

export interface GpvSnapshotProgress {
  rowsTotal: number;
  rowsApplied: number;
  rowsFailed: number;
}

interface GpvSnapshotProcessResult extends GpvSnapshotProgress {
  resultsJson: string;
}

export function createGpvSnapshotRunner(deps: {
  db: DatabaseExecutor;
  now: () => Date;
  readFile: (storageKey: string) => Promise<Uint8Array>;
  reportProgress: (
    id: GpvSnapshotJobId,
    progress: GpvSnapshotProgress,
  ) => Promise<unknown>;
}) {
  return {
    async process(
      job: GpvSnapshotJobRow,
      signal: AbortSignal,
    ): Promise<GpvSnapshotProcessResult> {
      const snapshot = await deps.db
        .selectFrom("gpv_snapshots as snapshot")
        .innerJoin("file_assets as file", "file.id", "snapshot.file_asset_id")
        .select([
          "snapshot.id",
          "snapshot.cut_at",
          "snapshot.state",
          "file.storage_key",
          "file.created_by_user_id",
        ])
        .where("snapshot.id", "=", job.snapshot_id)
        .executeTakeFirstOrThrow();

      if (
        snapshot.state === "active" ||
        snapshot.state === "superseded" ||
        snapshot.state === "needs_review" ||
        snapshot.state === "rejected"
      ) {
        return completedResult(job, snapshot.id, snapshot.state);
      }

      if (snapshot.state === "ready") {
        const activated = await activateGpvSnapshot(deps.db, {
          snapshotId: snapshot.id,
          activatedBy: snapshot.created_by_user_id,
          now: deps.now(),
        });

        if (!activated.ok) {
          throw new Error(
            `Unable to activate GPV snapshot: ${activated.error.code}`,
          );
        }

        return completedResult(job, snapshot.id, "active");
      }

      if (snapshot.state === "failed") {
        throw new Error("Cannot process a failed GPV snapshot");
      }

      if (signal.aborted) {
        throw new Error("Job aborted");
      }

      const processing = await deps.db
        .updateTable("gpv_snapshots")
        .set({ state: "processing" })
        .where("id", "=", snapshot.id)
        .where("state", "in", ["queued", "processing"])
        .returning("id")
        .executeTakeFirst();

      if (!processing) {
        throw new Error("GPV snapshot state changed before processing");
      }

      const bytes = await deps.readFile(snapshot.storage_key);
      const parsed = parseReport(bytes, { cutAt: snapshot.cut_at });

      if (isErr(parsed)) {
        throw new Error(`Unreadable GPV workbook: ${parsed.error.code}`);
      }
      if (signal.aborted) {
        throw new Error("Job aborted");
      }

      const now = deps.now();
      const staged = await deps.db.transaction().execute(async (tx) => {
        return stageGpvSnapshot(tx, snapshot.id, parsed.value, now);
      });
      await deps.reportProgress(job.id, staged);

      if (signal.aborted) {
        throw new Error("Job aborted");
      }

      const finalized = await deps.db.transaction().execute(async (tx) => {
        const issues = await validateGpvSnapshot(tx, snapshot.id, now);

        if (issues.blocking > 0) {
          return { issues, activationError: null };
        }
        if (signal.aborted) {
          throw new Error("Job aborted");
        }

        const activated = await activateGpvSnapshot(tx, {
          snapshotId: snapshot.id,
          activatedBy: snapshot.created_by_user_id,
          now,
        });

        return {
          issues,
          activationError: activated.ok ? null : activated.error.code,
        };
      });

      if (finalized.activationError) {
        throw new Error(
          `Unable to activate GPV snapshot: ${finalized.activationError}`,
        );
      }

      return {
        ...staged,
        resultsJson: JSON.stringify({
          snapshotId: snapshot.id,
          blockingIssues: finalized.issues.blocking,
          warnings: finalized.issues.warnings,
          activated: finalized.issues.blocking === 0,
        }),
      };
    },
  };
}

export type GpvSnapshotRunner = ReturnType<typeof createGpvSnapshotRunner>;

function completedResult(
  job: GpvSnapshotJobRow,
  snapshotId: GpvSnapshotJobRow["snapshot_id"],
  state: "active" | "superseded" | "needs_review" | "rejected",
): GpvSnapshotProcessResult {
  return {
    rowsTotal: job.rows_total ?? 0,
    rowsApplied: job.rows_applied ?? 0,
    rowsFailed: job.rows_failed ?? 0,
    resultsJson: JSON.stringify({
      snapshotId,
      activated: state === "active" || state === "superseded",
      state,
    }),
  };
}
