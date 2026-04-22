import type { LeadImportType } from "~/features/leads-imports/contracts";
import { normalizeCsvHeader } from "~/server/csv/core";

import type {
  HeaderCandidate,
  HeaderMatch,
  LeadImportCsvInspectionResult,
  LeadImportTypeDetectionErrorCode,
  ResolvedLayout,
} from "./contracts";
import {
  LEAD_IMPORT_DELIMITERS,
  PRIORITY_IMPORT_HEADERS,
  STATUS_IMPORT_HEADERS,
} from "./contracts";
import {
  assertSupportedLeadCsvLine,
  findFirstNonEmptyLine,
} from "./line-reader";

function normalizeCell(cell: string): string {
  return normalizeCsvHeader(cell.replace(/^\uFEFF/, ""));
}

function splitCsvLine(line: string, delimiter: "," | ";"): string[] {
  return line.split(delimiter).map((cell) => cell.trim());
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

  try {
    assertSupportedLeadCsvLine(headerLine);
  } catch (error) {
    return {
      ok: false,
      code: "unknown_headers",
      message:
        error instanceof Error
          ? error.message
          : "CSV headers do not match a supported import template",
      headers: [],
    };
  }

  return inspectHeaderCandidates(headerCandidatesFromLine(headerLine));
}

export function resolveLayoutForImportType(
  headerLine: string,
  importType: LeadImportType,
):
  | { ok: true; layout: ResolvedLayout }
  | {
      ok: false;
      code: LeadImportTypeDetectionErrorCode;
      message: string;
      headers: string[];
    } {
  const candidates = headerCandidatesFromLine(headerLine);
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
