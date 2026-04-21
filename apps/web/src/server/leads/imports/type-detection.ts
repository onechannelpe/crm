import { parseCsv } from "~/server/integrations/csv-parser";

import { PRIORITY_IMPORT_HEADERS } from "./priority-parser";
import { STATUS_IMPORT_HEADERS } from "./status-parser";

export type LeadImportType = "import_status" | "import_prioridad";

export type LeadImportTypeDetectionErrorCode =
  | "unknown_headers"
  | "ambiguous_headers"
  | "missing_required_headers";

export type LeadImportTypeDetectionResult =
  | { ok: true; type: LeadImportType; headers: string[] }
  | {
      ok: false;
      code: LeadImportTypeDetectionErrorCode;
      message: string;
      headers: string[];
    };

function isSupersetOf(source: string[], expected: readonly string[]): boolean {
  return expected.every((column) => source.includes(column));
}

export function detectLeadImportTypeFromCsv(
  csvText: string,
): LeadImportTypeDetectionResult {
  const parsed = parseCsv(csvText);
  const headers = parsed.headers;

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
    return { ok: true, type: "import_status", headers };
  }

  if (matchesPriority) {
    return { ok: true, type: "import_prioridad", headers };
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
