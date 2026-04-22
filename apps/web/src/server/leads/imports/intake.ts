import type { LeadImportType } from "~/features/leads-imports/contracts";
import { normalizeHeader } from "~/server/integrations/csv-parser";
import { PRIORITY_IMPORT_HEADERS } from "~/server/integrations/infrastructure/prioridad-import-parser";
import { STATUS_IMPORT_HEADERS } from "~/server/integrations/infrastructure/status-import-parser";

export type LeadImportTypeDetectionErrorCode =
  | "unknown_headers"
  | "ambiguous_headers"
  | "missing_required_headers";

export type LeadImportCsvInspectionResult =
  | {
      ok: true;
      importType: LeadImportType;
      headers: string[];
      rowsTotal: number;
    }
  | {
      ok: false;
      code: LeadImportTypeDetectionErrorCode;
      message: string;
      headers: string[];
    };

function detectDelimiter(firstLine: string): "," | ";" {
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

function parseCsvLine(line: string, delimiter: "," | ";"): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === delimiter && !inQuotes) {
      fields.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  fields.push(current);
  return fields;
}

function isSupersetOf(source: string[], expected: readonly string[]): boolean {
  return expected.every((column) => source.includes(column));
}

function parseHeaderAndCountRows(csvText: string): {
  headers: string[];
  rowsTotal: number;
} {
  const lines = csvText.split(/\r?\n/);
  let headerLine: string | null = null;
  let headerIndex = -1;

  for (let index = 0; index < lines.length; index++) {
    if (lines[index].trim().length === 0) {
      continue;
    }

    headerLine = lines[index];
    headerIndex = index;
    break;
  }

  if (!headerLine) {
    return { headers: [], rowsTotal: 0 };
  }

  const delimiter = detectDelimiter(headerLine);
  const headers = parseCsvLine(headerLine, delimiter).map(normalizeHeader);

  let rowsTotal = 0;
  for (let index = headerIndex + 1; index < lines.length; index++) {
    if (lines[index].trim().length === 0) {
      continue;
    }
    rowsTotal++;
  }

  return { headers, rowsTotal };
}

export function inspectLeadImportCsv(
  csvText: string,
): LeadImportCsvInspectionResult {
  const { headers, rowsTotal } = parseHeaderAndCountRows(csvText);

  if (headers.length === 0) {
    return {
      ok: false,
      code: "missing_required_headers",
      message: "CSV header row is required",
      headers,
    };
  }

  const matchesStatus = isSupersetOf(headers, STATUS_IMPORT_HEADERS);
  const matchesPriority = isSupersetOf(headers, PRIORITY_IMPORT_HEADERS);

  if (matchesStatus && matchesPriority) {
    return {
      ok: false,
      code: "ambiguous_headers",
      message: "CSV headers match multiple import types",
      headers,
    };
  }

  if (matchesStatus) {
    return {
      ok: true,
      importType: "import_status",
      headers,
      rowsTotal,
    };
  }

  if (matchesPriority) {
    return {
      ok: true,
      importType: "import_prioridad",
      headers,
      rowsTotal,
    };
  }

  const statusMissing = STATUS_IMPORT_HEADERS.filter(
    (h) => !headers.includes(h),
  );
  const priorityMissing = PRIORITY_IMPORT_HEADERS.filter(
    (h) => !headers.includes(h),
  );

  if (
    statusMissing.length < STATUS_IMPORT_HEADERS.length ||
    priorityMissing.length < PRIORITY_IMPORT_HEADERS.length
  ) {
    return {
      ok: false,
      code: "missing_required_headers",
      message:
        statusMissing.length <= priorityMissing.length
          ? `Missing required headers for status import: ${statusMissing.join(", ")}`
          : `Missing required headers for priority import: ${priorityMissing.join(", ")}`,
      headers,
    };
  }

  return {
    ok: false,
    code: "unknown_headers",
    message: "CSV headers do not match a supported import template",
    headers,
  };
}
