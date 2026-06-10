import {
  LEAD_PRIORITIES,
  LEAD_STATUSES,
} from "~/contracts/workflow/vocabulary";
import type { RecordImportType } from "~/features/records-imports/contracts";
import type { CsvDelimiter } from "~/server/csv/core";
import type { ImportRowInput } from "~/server/integrations/application/import/types";
import { parseOptionalVocabularyValue } from "~/server/workflow/parsers";

export interface RecordImportInvalidRow {
  row: number;
  reason: string;
  type: RecordImportType;
}

function readRecord(
  headers: readonly string[],
  cells: readonly string[],
): Record<string, string> {
  const record: Record<string, string> = {};

  for (let index = 0; index < headers.length; index++) {
    record[headers[index]] = (cells[index] ?? "").trim();
  }

  return record;
}

export function splitLeadCsvLine(
  line: string,
  delimiter: CsvDelimiter,
): string[] {
  return line.split(delimiter).map((cell) => cell.trim());
}

export function mapRecordImportRow(input: {
  rowNumber: number;
  importType: RecordImportType;
  headers: readonly string[];
  cells: readonly string[];
}):
  | { ok: true; row: ImportRowInput }
  | { ok: false; row: RecordImportInvalidRow } {
  const record = readRecord(input.headers, input.cells);
  const ruc = (record.documento ?? record.documento_a_consultar ?? "").trim();

  if (!/^\d+$/.test(ruc)) {
    return {
      ok: false,
      row: {
        row: input.rowNumber,
        reason: "Invalid RUC",
        type: input.importType,
      },
    };
  }

  if (input.importType === "import_status") {
    const statusRaw = (record.resultado ?? "").trim().toUpperCase();
    const status = parseOptionalVocabularyValue(
      statusRaw,
      LEAD_STATUSES,
      "invalid_status",
    );
    if (!status.ok || status.value === undefined) {
      return {
        ok: false,
        row: {
          row: input.rowNumber,
          reason: `Invalid resultado: ${statusRaw}`,
          type: "import_status",
        },
      };
    }

    return {
      ok: true,
      row: {
        row: input.rowNumber,
        ruc,
        type: "import_status",
        status: status.value,
      },
    };
  }

  const priorityRaw = (record.prioridad ?? "").trim().toUpperCase();
  const priorityToken = priorityRaw.split(/\s+/)[0];
  const priorityInput =
    priorityToken === "P1" || priorityToken === "P2"
      ? priorityToken
      : priorityRaw;
  const prioridad = parseOptionalVocabularyValue(
    priorityInput,
    LEAD_PRIORITIES,
    "invalid_prioridad",
  );

  if (!prioridad.ok || prioridad.value === undefined) {
    return {
      ok: false,
      row: {
        row: input.rowNumber,
        reason: `Invalid prioridad: ${priorityInput}`,
        type: "import_prioridad",
      },
    };
  }

  return {
    ok: true,
    row: {
      row: input.rowNumber,
      ruc,
      type: "import_prioridad",
      prioridad: prioridad.value,
    },
  };
}
