import type { LeadImportType } from "~/features/leads-imports/contracts";
import { normalizeCsvHeader, type CsvDelimiter } from "~/server/csv/core";
import type { ImportRowInput } from "~/server/integrations/application/import/types";
import {
  parseLeadPriority,
  parseLeadStatus,
} from "~/server/pipeline/domain/lead-schema-parser";

const LEAD_IMPORT_DELIMITERS: readonly CsvDelimiter[] = [",", ";"] as const;
export const MAX_LEAD_IMPORT_ROWS = 10_000;

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
    }
  | {
      ok: false;
      code: LeadImportTypeDetectionErrorCode;
      message: string;
      headers: string[];
    };

type LeadImportStreamFactory = () => ReadableStream<Uint8Array>;

interface HeaderMatch {
  expected: readonly string[];
  missing: string[];
  unknown: string[];
  exact: boolean;
}

interface HeaderCandidate {
  delimiter: CsvDelimiter;
  headers: string[];
  statusMatch: HeaderMatch;
  priorityMatch: HeaderMatch;
}

interface ResolvedLayout {
  delimiter: CsvDelimiter;
  headers: string[];
}

function normalizeCell(cell: string): string {
  return normalizeCsvHeader(cell.replace(/^\uFEFF/, ""));
}

function splitCsvLine(line: string, delimiter: CsvDelimiter): string[] {
  return line.split(delimiter).map((cell) => cell.trim());
}

function isLineEmpty(line: string): boolean {
  return line.trim().length === 0;
}

function assertSupportedLeadCsvLine(line: string): void {
  if (!line.includes('"')) {
    return;
  }
  throw new Error("Quoted CSV fields are not supported for lead imports");
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
    exact:
      missing.length === 0 &&
      unknown.length === 0 &&
      headers.length === expected.length,
  };
}

function getMatchIssueScore(match: HeaderMatch): number {
  return match.missing.length + match.unknown.length;
}

function isBestMatchCandidate(match: HeaderMatch): boolean {
  return (
    match.missing.length < match.expected.length ||
    match.unknown.length < match.expected.length
  );
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

function headerCandidatesFromLine(line: string): HeaderCandidate[] {
  return LEAD_IMPORT_DELIMITERS.map((delimiter) => {
    const headers = splitCsvLine(line, delimiter).map(normalizeCell);
    return {
      delimiter,
      headers,
      statusMatch: buildHeaderMatch(headers, STATUS_IMPORT_HEADERS),
      priorityMatch: buildHeaderMatch(headers, PRIORITY_IMPORT_HEADERS),
    };
  });
}

function inspectHeaderCandidates(
  candidates: readonly HeaderCandidate[],
): LeadImportCsvInspectionResult {
  const exactStatus = candidates.filter((c) => c.statusMatch.exact);
  const exactPriority = candidates.filter((c) => c.priorityMatch.exact);

  if (exactStatus.length > 0 && exactPriority.length > 0) {
    return {
      ok: false,
      code: "ambiguous_headers",
      message: "CSV headers match multiple import types",
      headers: candidates[0]?.headers ?? [],
    };
  }

  if (exactStatus.length === 1) {
    return {
      ok: true,
      importType: "import_status",
      headers: exactStatus[0].headers,
    };
  }

  if (exactPriority.length === 1) {
    return {
      ok: true,
      importType: "import_prioridad",
      headers: exactPriority[0].headers,
    };
  }

  const bestStatus = candidates
    .map((candidate) => candidate.statusMatch)
    .toSorted((a, b) => getMatchIssueScore(a) - getMatchIssueScore(b))[0];
  const bestPriority = candidates
    .map((candidate) => candidate.priorityMatch)
    .toSorted((a, b) => getMatchIssueScore(a) - getMatchIssueScore(b))[0];

  if (
    bestStatus &&
    bestPriority &&
    (isBestMatchCandidate(bestStatus) || isBestMatchCandidate(bestPriority))
  ) {
    const preferStatus =
      getMatchIssueScore(bestStatus) <= getMatchIssueScore(bestPriority);
    return {
      ok: false,
      code: "missing_required_headers",
      message: preferStatus
        ? formatHeaderErrors(bestStatus, "import_status")
        : formatHeaderErrors(bestPriority, "import_prioridad"),
      headers: candidates[0]?.headers ?? [],
    };
  }

  return {
    ok: false,
    code: "unknown_headers",
    message: "CSV headers do not match a supported import template",
    headers: candidates[0]?.headers ?? [],
  };
}

function resolveLayoutForImportType(
  line: string,
  importType: LeadImportType,
):
  | { ok: true; layout: ResolvedLayout }
  | {
      ok: false;
      code: LeadImportTypeDetectionErrorCode;
      message: string;
      headers: string[];
    } {
  const candidates = headerCandidatesFromLine(line);
  const matches = candidates.filter((candidate) =>
    importType === "import_status"
      ? candidate.statusMatch.exact
      : candidate.priorityMatch.exact,
  );

  if (matches.length === 1) {
    return {
      ok: true,
      layout: {
        delimiter: matches[0].delimiter,
        headers: matches[0].headers,
      },
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

  const best = candidates
    .map((candidate) =>
      importType === "import_status"
        ? candidate.statusMatch
        : candidate.priorityMatch,
    )
    .toSorted((a, b) => getMatchIssueScore(a) - getMatchIssueScore(b))[0];

  return {
    ok: false,
    code: "missing_required_headers",
    message: best
      ? formatHeaderErrors(best, importType)
      : "CSV header row is required",
    headers: candidates[0]?.headers ?? [],
  };
}

function findFirstNonEmptyLine(csvText: string): string | null {
  let start = 0;

  while (start < csvText.length) {
    const newlineIndex = csvText.indexOf("\n", start);
    const rawLine =
      newlineIndex === -1
        ? csvText.slice(start)
        : csvText.slice(start, newlineIndex);
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;

    if (!isLineEmpty(line)) {
      return line;
    }

    if (newlineIndex === -1) {
      break;
    }
    start = newlineIndex + 1;
  }

  return null;
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

async function consumeCsvLinesFromStream(
  stream: ReadableStream<Uint8Array>,
  onLine: (line: string, rowNumber: number) => boolean | void,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffered = "";
  let rowNumber = 0;

  const processBufferedLines = (flushLastLine: boolean): boolean => {
    while (true) {
      const newlineIndex = buffered.indexOf("\n");
      if (newlineIndex < 0) {
        break;
      }

      let line = buffered.slice(0, newlineIndex);
      if (line.endsWith("\r")) {
        line = line.slice(0, -1);
      }

      rowNumber++;
      const shouldContinue = onLine(line, rowNumber);
      buffered = buffered.slice(newlineIndex + 1);
      if (shouldContinue === false) {
        return false;
      }
    }

    if (flushLastLine && buffered.length > 0) {
      let line = buffered;
      if (line.endsWith("\r")) {
        line = line.slice(0, -1);
      }

      rowNumber++;
      const shouldContinue = onLine(line, rowNumber);
      buffered = "";
      if (shouldContinue === false) {
        return false;
      }
    }

    return true;
  };

  try {
    const readSequentially = async (): Promise<void> => {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }

      buffered += decoder.decode(value, { stream: true });
      if (!processBufferedLines(false)) {
        return;
      }

      await readSequentially();
    };

    await readSequentially();

    buffered += decoder.decode();
    processBufferedLines(true);
  } finally {
    reader.releaseLock();
  }
}

export function inspectLeadImportCsv(
  csvText: string,
): LeadImportCsvInspectionResult {
  const headerLine = findFirstNonEmptyLine(csvText);
  if (!headerLine) {
    return {
      ok: false,
      code: "missing_required_headers",
      message: "CSV header row is required",
      headers: [],
    };
  }

  if (headerLine.includes('"')) {
    return {
      ok: false,
      code: "unknown_headers",
      message: "Quoted CSV fields are not supported for lead imports",
      headers: [],
    };
  }

  return inspectHeaderCandidates(headerCandidatesFromLine(headerLine));
}

export async function parseLeadImportRowsFromStream(input: {
  streamFactory: LeadImportStreamFactory;
  importType: LeadImportType;
}): Promise<{
  validRows: ImportRowInput[];
  invalidRows: Array<{
    row: number;
    reason: string;
    type: "import_status" | "import_prioridad";
  }>;
}> {
  const validRows: ImportRowInput[] = [];
  const invalidRows: Array<{
    row: number;
    reason: string;
    type: "import_status" | "import_prioridad";
  }> = [];

  let layout: ResolvedLayout | null = null;
  let processedRows = 0;

  await consumeCsvLinesFromStream(input.streamFactory(), (line, rowNumber) => {
    if (isLineEmpty(line)) {
      return;
    }

    assertSupportedLeadCsvLine(line);

    if (!layout) {
      const resolution = resolveLayoutForImportType(line, input.importType);
      if (!resolution.ok) {
        throw new Error(resolution.message);
      }
      layout = resolution.layout;
      return;
    }

    const cells = splitCsvLine(line, layout.delimiter);
    if (cells.length !== layout.headers.length) {
      invalidRows.push({
        row: rowNumber,
        reason: `Invalid column count: expected ${layout.headers.length}, got ${cells.length}`,
        type: input.importType,
      });
      return;
    }

    processedRows++;
    if (processedRows > MAX_LEAD_IMPORT_ROWS) {
      throw new Error(
        `Import exceeds maximum supported rows (${MAX_LEAD_IMPORT_ROWS})`,
      );
    }

    const record = readRecord(layout.headers, cells);
    const ruc = record.documento ?? "";

    if (!/^\d+$/.test(ruc)) {
      invalidRows.push({
        row: rowNumber,
        reason: "Invalid RUC",
        type: input.importType,
      });
      return;
    }

    if (input.importType === "import_status") {
      const statusRaw = (record.resultado ?? "").trim().toUpperCase();
      const status = parseLeadStatus(statusRaw);
      if (!status.ok || status.value === undefined) {
        invalidRows.push({
          row: rowNumber,
          reason: `Invalid resultado: ${statusRaw}`,
          type: "import_status",
        });
        return;
      }

      validRows.push({
        row: rowNumber,
        ruc,
        type: "import_status",
        status: status.value,
      });
      return;
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
        row: rowNumber,
        reason: `Invalid prioridad: ${priorityInput}`,
        type: "import_prioridad",
      });
      return;
    }

    validRows.push({
      row: rowNumber,
      ruc,
      type: "import_prioridad",
      prioridad: prioridad.value,
    });
  });

  if (!layout) {
    throw new Error("CSV header row is required");
  }

  return { validRows, invalidRows };
}
