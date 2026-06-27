import type { Role } from "~/lib/auth/access/rbac";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { enqueueLeadEffects } from "~/server/workflow/effects/enqueue-lead-effects";
import type { CommittedLeadEvent } from "~/server/workflow/lead/write/transition";

import { applyLeadMutation } from "./lead-mutation-writer";
import { stageImportRows } from "./staging-repo";
import type { ImportRowInput, RowResult } from "./types";

interface ImportApplyPorts {
  executor: DatabaseExecutor;
  now: number;
}

function resultSort(a: RowResult, b: RowResult): number {
  return a.row - b.row;
}

async function loadImportActor(
  executor: DatabaseExecutor,
  actorId: number,
): Promise<{ userId: number; role: Role }> {
  const user = await executor
    .selectFrom("users")
    .select(["id", "role"])
    .where("id", "=", actorId)
    .executeTakeFirstOrThrow();

  return { userId: user.id, role: user.role };
}

export async function applyImportRows(
  input: {
    jobId: string;
    actorId: number;
    validRows: ImportRowInput[];
    invalidRows: Array<{
      row: number;
      reason: string;
      type: "import_status" | "import_prioridad";
    }>;
    onProgress?: (progress: {
      rowsTotal: number;
      rowsApplied: number;
      rowsFailed: number;
    }) => void;
    progressEveryRows?: number;
  },
  ports: ImportApplyPorts,
): Promise<{
  results: RowResult[];
  applied: number;
  failed: number;
}> {
  const rowsTotal = input.validRows.length + input.invalidRows.length;
  const { executor, now } = ports;
  const results: RowResult[] = input.invalidRows.map((row) => ({
    row: row.row,
    ok: false,
    reason: row.reason,
  }));
  const sortedRows = input.validRows.toSorted((a, b) => a.row - b.row);
  let applied = 0;
  let failed = input.invalidRows.length;
  const committedEvents: CommittedLeadEvent[] = [];
  const progressEveryRows = Math.max(1, input.progressEveryRows ?? 50);
  let lastEmittedProcessed = -1;

  function emitProgress(force: boolean): void {
    if (!input.onProgress) {
      return;
    }

    const processed = applied + failed;
    if (
      !force &&
      processed - lastEmittedProcessed < progressEveryRows &&
      processed < rowsTotal
    ) {
      return;
    }

    lastEmittedProcessed = processed;
    input.onProgress({
      rowsTotal,
      rowsApplied: applied,
      rowsFailed: failed,
    });
  }

  emitProgress(true);

  await executor.transaction().execute(async (trx) => {
    const actor = await loadImportActor(trx, input.actorId);

    await stageImportRows(trx, input.jobId, sortedRows, input.invalidRows, now);

    // Rows apply in file order inside one transaction so later rows see earlier
    // mutations and the outbox plan matches the committed import sequence.
    /* eslint-disable no-await-in-loop */
    for (const row of sortedRows) {
      const mutationResult = await applyLeadMutation({
        executor: trx,
        jobId: input.jobId,
        actor,
        row,
        now,
      });
      results.push(mutationResult.rowResult);
      if (!mutationResult.ok) {
        failed++;
        emitProgress(false);
        continue;
      }

      committedEvents.push(...mutationResult.committed);
      applied++;
      emitProgress(false);
    }
    /* eslint-enable no-await-in-loop */

    await enqueueLeadEffects(trx, committedEvents, now);
  });
  emitProgress(true);

  const sortedResults = results.toSorted(resultSort);
  return {
    results: sortedResults,
    applied,
    failed: sortedResults.filter((row) => !row.ok).length,
  };
}
