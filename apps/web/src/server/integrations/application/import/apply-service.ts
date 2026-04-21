import type { DatabaseExecutor } from "~/server/shared/db-executor";

import { writeHistoryAndAudit } from "./history-audit-writer";
import { applyLeadMutation } from "./lead-mutation-writer";
import {
  createEmptyOutboxPlan,
  persistOutboxPlan,
  planOutboxForMutation,
} from "./outbox-planner";
import { stageImportRows } from "./staging-repo";
import type { ImportRowInput, RowResult } from "./types";

function resultSort(a: RowResult, b: RowResult): number {
  return a.row - b.row;
}

export async function applyImportRows(
  input: {
    jobId: number;
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
    }) => Promise<void> | void;
  },
  executor: DatabaseExecutor,
): Promise<{
  results: RowResult[];
  applied: number;
  failed: number;
}> {
  const rowsTotal = input.validRows.length + input.invalidRows.length;
  const now = Date.now();
  const results: RowResult[] = input.invalidRows.map((row) => ({
    row: row.row,
    ok: false,
    reason: row.reason,
  }));
  const sortedRows = input.validRows.toSorted((a, b) => a.row - b.row);
  let applied = 0;
  let failed = input.invalidRows.length;
  const outboxPlan = createEmptyOutboxPlan();

  if (input.onProgress) {
    await input.onProgress({
      rowsTotal,
      rowsApplied: applied,
      rowsFailed: failed,
    });
  }

  await executor.transaction().execute(async (trx) => {
    await stageImportRows(trx, input.jobId, sortedRows, input.invalidRows, now);

    /* eslint-disable no-await-in-loop */
    for (const row of sortedRows) {
      const mutationResult = await applyLeadMutation({
        executor: trx,
        jobId: input.jobId,
        actorId: input.actorId,
        row,
      });
      results.push(mutationResult.rowResult);
      if (!mutationResult.ok) {
        failed++;
        if (input.onProgress) {
          await input.onProgress({
            rowsTotal,
            rowsApplied: applied,
            rowsFailed: failed,
          });
        }
        continue;
      }

      await writeHistoryAndAudit({
        executor: trx,
        actorId: input.actorId,
        mutation: mutationResult.mutation,
      });
      await planOutboxForMutation({
        executor: trx,
        mutation: mutationResult.mutation,
        outboxPlan,
      });
      applied++;
      if (input.onProgress) {
        await input.onProgress({
          rowsTotal,
          rowsApplied: applied,
          rowsFailed: failed,
        });
      }
    }
    /* eslint-enable no-await-in-loop */

    await persistOutboxPlan({
      executor: trx,
      outboxPlan,
      now: Date.now(),
    });
  });

  const sortedResults = results.toSorted(resultSort);
  return {
    results: sortedResults,
    applied,
    failed: sortedResults.filter((row) => !row.ok).length,
  };
}
