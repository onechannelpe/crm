import { randomUUIDv7 } from "bun";
import type { Transaction } from "kysely";

import type { Database } from "~/lib/db/types";
import type { IntegrationJobId } from "~/server/shared/ids";

import type { ImportRowInput } from "./types";

export async function stageImportRows(
  trx: Transaction<Database>,
  jobId: IntegrationJobId,
  validRows: ImportRowInput[],
  invalidRows: Array<{
    row: number;
    reason: string;
    type: "import_status" | "import_prioridad";
  }>,
  now: Date,
) {
  if (validRows.length > 0) {
    await trx
      .insertInto("workflow_integration_import_rows")
      .values(
        validRows.map((row) => ({
          id: randomUUIDv7(),
          integration_job_id: jobId,
          row_number: row.row,
          type: row.type,
          ruc: row.ruc,
          status_value: row.type === "import_status" ? row.status : null,
          prioridad_value:
            row.type === "import_prioridad" ? row.priority : null,
          state: "staged",
          lead_id: null,
          failure_reason: null,
          created_at: now,
          applied_at: null,
        })),
      )
      .execute();
  }

  if (invalidRows.length > 0) {
    await trx
      .insertInto("workflow_integration_import_rows")
      .values(
        invalidRows.map((row) => ({
          id: randomUUIDv7(),
          integration_job_id: jobId,
          row_number: row.row,
          type: row.type,
          ruc: "",
          status_value: null,
          prioridad_value: null,
          state: "failed",
          lead_id: null,
          failure_reason: row.reason,
          created_at: now,
          applied_at: null,
        })),
      )
      .execute();
  }
}
