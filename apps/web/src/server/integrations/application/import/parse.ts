import {
  parsePrioridadImport,
  type ParsedPrioridadRow,
} from "../../infrastructure/prioridad-import-parser";
import { parseStatusImport, type ParsedStatusRow } from "../../infrastructure/status-import-parser";
import type { IntegrationJobRow } from "../../types";
import type { ImportRowInput } from "./types";

export function parseImportRows(job: IntegrationJobRow, text: string): {
  validRows: ImportRowInput[];
  invalidRows: Array<{ row: number; reason: string; type: "import_status" | "import_prioridad" }>;
} {
  if (job.type === "import_status") {
    const parsed = parseStatusImport(text);
    return {
      validRows: parsed.valid.map((row: ParsedStatusRow) => ({
        row: row.row,
        ruc: row.ruc,
        type: "import_status",
        status: row.status,
      })),
      invalidRows: parsed.invalid.map((row) => ({
        row: row.row,
        reason: row.reason,
        type: "import_status",
      })),
    };
  }

  if (job.type === "import_prioridad") {
    const parsed = parsePrioridadImport(text);
    return {
      validRows: parsed.valid.map((row: ParsedPrioridadRow) => ({
        row: row.row,
        ruc: row.ruc,
        type: "import_prioridad",
        prioridad: row.prioridad,
      })),
      invalidRows: parsed.invalid.map((row) => ({
        row: row.row,
        reason: row.reason,
        type: "import_prioridad",
      })),
    };
  }

  throw new Error(`Invalid import job type: ${job.type}`);
}
