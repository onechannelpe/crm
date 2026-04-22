import type { LeadImportType } from "~/features/leads-imports/contracts";
import {
  countNonEmptyCsvRows,
  normalizeCsvHeader,
  parseCsvRows,
  readFirstNonEmptyCsvRow,
  type CsvDelimiter,
  type CsvRow,
} from "~/server/csv/core";
import type { ImportRowInput } from "~/server/integrations/application/import/types";
import {
  parseLeadPriority,
  parseLeadStatus,
} from "~/server/pipeline/domain/lead-schema-parser";

const LEAD_IMPORT_DELIMITERS: readonly CsvDelimiter[] = [",", ";"] as const;

export const STATUS_IMPORT_HEADERS = [
  "nro_de_solicitud",
  "fecha_de_solicitud",
  "canal",
  "nombre_de_agencia_dealer",
  "documento",
  "resultado",
] as const;

export const PRIORITY_IMPORT_HEADERS = [
  "nro_de_solicitud",
  "fecha",
  "usuario",
  "dealer",
  "documento",
  "segmento",
  "prioridad",
  "categoria",
] as const;

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

interface HeaderMatch {
  expected: readonly string[];
  missing: string[];
  unknown: string[];
  exact: boolean;
}

interface DelimiterInspection {
  delimiter: CsvDelimiter;
  headerRow: CsvRow;
  headers: string[];
  statusMatch: HeaderMatch;
  priorityMatch: HeaderMatch;
}

function isHeaderRowEmpty(headers: readonly string[]): boolean {
  return headers.every((header) => header.trim().length === 0);
}

function buildHeaderMatch(
  headers: readonly string[],
  expected: readonly string[],
): HeaderMatch {
  const missing = expected.filter((column) => !headers.includes(column));
  const unknown = headers.filter((column) => !expected.includes(column));
  return {
    expected,
    missing,
    unknown,
    exact: missing.length === 0 && unknown.length === 0,
  };
}

function isBestMatchCandidate(match: HeaderMatch): boolean {
  return (
    match.missing.length < match.expected.length ||
    match.unknown.length < match.expected.length
  );
}

function getMatchIssueScore(match: HeaderMatch): number {
  return match.missing.length + match.unknown.length;
}

function formatHeaderErrors(
  match: HeaderMatch,
  importType: LeadImportType,
): string {
  const details: string[] = [];
  if (match.missing.length > 0) {
    details.push(`missing: ${match.missing.join(", ")}`);
  }
  if (match.unknown.length > 0) {
    details.push(`unknown: ${match.unknown.join(", ")}`);
  }

  const importLabel =
    importType === "import_status" ? "status import" : "priority import";

  if (details.length === 0) {
    return `CSV headers do not match ${importLabel}`;
  }

  return `Invalid headers for ${importLabel} (${details.join("; ")})`;
}

function readDelimiterInspections(csvText: string): DelimiterInspection[] {
  const inspections: DelimiterInspection[] = [];

  for (const delimiter of LEAD_IMPORT_DELIMITERS) {
    const headerRow = readFirstNonEmptyCsvRow(csvText, delimiter);
    if (!headerRow) {
      continue;
    }

    const headers = headerRow.cells.map(normalizeCsvHeader);
    inspections.push({
      delimiter,
      headerRow,
      headers,
      statusMatch: buildHeaderMatch(headers, STATUS_IMPORT_HEADERS),
      priorityMatch: buildHeaderMatch(headers, PRIORITY_IMPORT_HEADERS),
    });
  }

  return inspections;
}

function resolveLeadImportDelimiter(
  csvText: string,
  importType: "import_status" | "import_prioridad",
):
  | {
      ok: true;
      delimiter: CsvDelimiter;
      headerRowNumber: number;
      headers: string[];
    }
  | {
      ok: false;
      code: LeadImportTypeDetectionErrorCode;
      message: string;
      headers: string[];
    } {
  const inspections = readDelimiterInspections(csvText);
  if (inspections.length === 0) {
    return {
      ok: false,
      code: "missing_required_headers",
      message: "CSV header row is required",
      headers: [],
    };
  }

  const matches = inspections.filter((inspection) =>
    importType === "import_status"
      ? inspection.statusMatch.exact
      : inspection.priorityMatch.exact,
  );

  if (matches.length === 1) {
    const match = matches[0];
    return {
      ok: true,
      delimiter: match.delimiter,
      headerRowNumber: match.headerRow.rowNumber,
      headers: match.headers,
    };
  }

  if (matches.length > 1) {
    return {
      ok: false,
      code: "ambiguous_headers",
      message: "CSV headers are ambiguous across delimiters",
      headers: matches[0].headers,
    };
  }

  const best = inspections
    .map((inspection) =>
      importType === "import_status"
        ? inspection.statusMatch
        : inspection.priorityMatch,
    )
    .toSorted((a, b) => getMatchIssueScore(a) - getMatchIssueScore(b))[0];

  return {
    ok: false,
    code: "missing_required_headers",
    message: formatHeaderErrors(best, importType),
    headers: inspections[0].headers,
  };
}

function readRecord(
  headers: readonly string[],
  row: CsvRow,
): Record<string, string> {
  const record: Record<string, string> = {};

  for (let index = 0; index < headers.length; index++) {
    record[headers[index]] = (row.cells[index] ?? "").trim();
  }

  return record;
}

export function inspectLeadImportCsv(
  csvText: string,
): LeadImportCsvInspectionResult {
  const inspections = readDelimiterInspections(csvText);
  if (inspections.length === 0) {
    return {
      ok: false,
      code: "missing_required_headers",
      message: "CSV header row is required",
      headers: [],
    };
  }

  const exactStatus = inspections.filter(
    (inspection) => inspection.statusMatch.exact,
  );
  const exactPriority = inspections.filter(
    (inspection) => inspection.priorityMatch.exact,
  );

  if (exactStatus.length > 0 && exactPriority.length > 0) {
    return {
      ok: false,
      code: "ambiguous_headers",
      message: "CSV headers match multiple import types",
      headers: inspections[0].headers,
    };
  }

  if (exactStatus.length === 1) {
    const inspection = exactStatus[0];
    return {
      ok: true,
      importType: "import_status",
      headers: inspection.headers,
      rowsTotal: countNonEmptyCsvRows(csvText, inspection.delimiter, {
        afterRowNumber: inspection.headerRow.rowNumber,
      }),
    };
  }

  if (exactPriority.length === 1) {
    const inspection = exactPriority[0];
    return {
      ok: true,
      importType: "import_prioridad",
      headers: inspection.headers,
      rowsTotal: countNonEmptyCsvRows(csvText, inspection.delimiter, {
        afterRowNumber: inspection.headerRow.rowNumber,
      }),
    };
  }

  const firstHeaders = inspections[0].headers;
  if (isHeaderRowEmpty(firstHeaders)) {
    return {
      ok: false,
      code: "missing_required_headers",
      message: "CSV header row is required",
      headers: firstHeaders,
    };
  }

  const bestStatusMatch = inspections
    .map((inspection) => inspection.statusMatch)
    .toSorted((a, b) => getMatchIssueScore(a) - getMatchIssueScore(b))[0];
  const bestPriorityMatch = inspections
    .map((inspection) => inspection.priorityMatch)
    .toSorted((a, b) => getMatchIssueScore(a) - getMatchIssueScore(b))[0];

  if (
    isBestMatchCandidate(bestStatusMatch) ||
    isBestMatchCandidate(bestPriorityMatch)
  ) {
    const preferStatus =
      getMatchIssueScore(bestStatusMatch) <=
      getMatchIssueScore(bestPriorityMatch);
    return {
      ok: false,
      code: "missing_required_headers",
      message: preferStatus
        ? formatHeaderErrors(bestStatusMatch, "import_status")
        : formatHeaderErrors(bestPriorityMatch, "import_prioridad"),
      headers: firstHeaders,
    };
  }

  return {
    ok: false,
    code: "unknown_headers",
    message: "CSV headers do not match a supported import template",
    headers: firstHeaders,
  };
}

export function parseLeadImportRows(input: {
  csvText: string;
  importType: "import_status" | "import_prioridad";
}): {
  validRows: ImportRowInput[];
  invalidRows: Array<{
    row: number;
    reason: string;
    type: "import_status" | "import_prioridad";
  }>;
} {
  const resolved = resolveLeadImportDelimiter(input.csvText, input.importType);
  if (!resolved.ok) {
    throw new Error(resolved.message);
  }

  const rows = parseCsvRows(input.csvText, resolved.delimiter);
  const validRows: ImportRowInput[] = [];
  const invalidRows: Array<{
    row: number;
    reason: string;
    type: "import_status" | "import_prioridad";
  }> = [];

  for (const row of rows) {
    if (row.rowNumber <= resolved.headerRowNumber) {
      continue;
    }

    if (row.cells.every((cell) => cell.trim().length === 0)) {
      continue;
    }

    const record = readRecord(resolved.headers, row);
    const ruc = record.documento ?? "";

    if (!/^\d+$/.test(ruc)) {
      invalidRows.push({
        row: row.rowNumber,
        reason: "Invalid RUC",
        type: input.importType,
      });
      continue;
    }

    if (input.importType === "import_status") {
      const statusRaw = (record.resultado ?? "").trim().toUpperCase();
      const status = parseLeadStatus(statusRaw);
      if (!status.ok || status.value === undefined) {
        invalidRows.push({
          row: row.rowNumber,
          reason: `Invalid resultado: ${statusRaw}`,
          type: "import_status",
        });
        continue;
      }

      validRows.push({
        row: row.rowNumber,
        ruc,
        type: "import_status",
        status: status.value,
      });
      continue;
    }

    const priorityRaw = (record.prioridad ?? "").trim().toUpperCase();
    const priorityToken = priorityRaw.split(/\s+/)[0];
    const priorityInput =
      priorityToken === "P1" || priorityToken === "P2"
        ? priorityToken
        : priorityRaw;
    const prioridad = parseLeadPriority(priorityInput);

    if (!prioridad.ok || prioridad.value === undefined) {
      invalidRows.push({
        row: row.rowNumber,
        reason: `Invalid prioridad: ${priorityInput}`,
        type: "import_prioridad",
      });
      continue;
    }

    validRows.push({
      row: row.rowNumber,
      ruc,
      type: "import_prioridad",
      prioridad: prioridad.value,
    });
  }

  return { validRows, invalidRows };
}
