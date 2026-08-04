import type { GpvSnapshotJobId } from "~/domain/ids";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import type { JobContext } from "~/server/platform/operation/context";
import { isErr } from "~/shared/result";

import { parseReport } from "../intake/parse-report";
import {
  activateGpvSnapshot,
  activateGpvSnapshotInTransaction,
} from "./activate";
import type { GpvSnapshotJobRow } from "./repo";
import { stageGpvSnapshot } from "./stage";
import { validateGpvSnapshotInTransaction } from "./validate";

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
  readFile: (storageKey: string) => Promise<Uint8Array>;
  reportProgress: (
    id: GpvSnapshotJobId,
    progress: GpvSnapshotProgress,
  ) => Promise<unknown>;
}) {
  return {
    async process(
      job: GpvSnapshotJobRow,
      context: JobContext,
    ): Promise<GpvSnapshotProcessResult> {
      const { abortSignal, operationAt } = context;
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
          activatedAt: operationAt,
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

      if (abortSignal.aborted) {
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
      if (abortSignal.aborted) {
        throw new Error("Job aborted");
      }

      const staged = await deps.db.transaction().execute(async (tx) => {
        return stageGpvSnapshot(tx, snapshot.id, parsed.value, operationAt);
      });
      await deps.reportProgress(job.id, staged);

      if (abortSignal.aborted) {
        throw new Error("Job aborted");
      }

      const finalized = await deps.db.transaction().execute(async (tx) => {
        const issues = await validateGpvSnapshotInTransaction(
          tx,
          snapshot.id,
          operationAt,
        );

        if (issues.blocking > 0) {
          return { issues, activationError: null };
        }
        if (abortSignal.aborted) {
          throw new Error("Job aborted");
        }

        const activated = await activateGpvSnapshotInTransaction(tx, {
          snapshotId: snapshot.id,
          activatedBy: snapshot.created_by_user_id,
          activatedAt: operationAt,
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
