import type { RecordImportType } from "~/features/records-imports/contracts";
import { parseCsvRows } from "~/server/csv/core";

import {
  normalizeHeader,
  PRIORITY_IMPORT_HEADERS,
  STATUS_IMPORT_HEADERS,
} from "./contracts";

interface ExtractedRows {
  importType: RecordImportType;
  headers: string[];
  rows: string[][];
}

function detectImportType(normalized: string[]): RecordImportType | null {
  if (
    normalized.length === STATUS_IMPORT_HEADERS.length &&
    normalized.every((h, i) => h === STATUS_IMPORT_HEADERS[i])
  ) {
    return "import_status";
  }
  if (
    normalized.length === PRIORITY_IMPORT_HEADERS.length &&
    normalized.every((h, i) => h === PRIORITY_IMPORT_HEADERS[i])
  ) {
    return "import_prioridad";
  }
  return null;
}

export function fromCsv(buffer: ArrayBuffer): ExtractedRows {
  const text = new TextDecoder("utf-8").decode(buffer);

  for (const delimiter of [",", ";"] as const) {
    const parsed = parseCsvRows(text, delimiter);

    for (let i = 0; i < parsed.length; i++) {
      const row = parsed[i];
      const normalized = row.cells.map((c) => normalizeHeader(c));
      const importType = detectImportType(normalized);

      if (importType !== null) {
        const rows = parsed
          .slice(i + 1)
          .map((r) => r.cells.map((c) => c.trim()))
          .filter((cells) => cells.some((c) => c.length > 0));

        return { importType, headers: normalized, rows };
      }
    }
  }

  throw new Error("CSV headers do not match a supported import template");
}
