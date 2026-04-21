import { applyImportRows } from "~/server/integrations/application/import/apply-service";
import type { ImportRowInput } from "~/server/integrations/application/import/types";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

export async function applyLeadImportRows(
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
  results: Array<{ row: number; ok: boolean; reason?: string }>;
  applied: number;
  failed: number;
}> {
  return applyImportRows(input, executor);
}
