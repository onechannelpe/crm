import { read, utils, type WorkBook, type WorkSheet } from "xlsx";

import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { firstOfMonth } from "./cells";
import {
  GPV_REQUIRED_HEADERS,
  headerSetHasAll,
  normalizeGpvHeader,
} from "./columns";
import { decodeRow } from "./decode-row";
import type { GpvCellValue, ParsedReport, Rejection, SourceRow } from "./types";

interface ExtractedSheet {
  headers: string[];
  rows: GpvCellValue[][];
}

export interface ParseReportInput {
  // The cut the export was taken at, read from the filename at the boundary and
  // confirmed by the uploader. An input rather than an inference: the decoder
  // must not read a clock or guess from the data, or the same bytes stop
  // decoding to the same rows and a stored report stops being replayable.
  cutAt: Date;
}

// Turns one workbook into rows and rejections. Pure: no clock, no DB, no IO.
//
// A row that cannot be read becomes a Rejection rather than failing the file;
// only a workbook with no GPV worksheet at all is an error.
export function parseReport(
  buffer: ArrayBuffer,
  input: ParseReportInput,
): Result<ParsedReport, DomainError> {
  const workbook = read(buffer, { type: "array", cellDates: true });
  const sheet = selectGpvSheet(workbook);
  if (isErr(sheet)) return sheet;

  const cutMonth = firstOfMonth(isoDay(input.cutAt));
  const rows: SourceRow[] = [];
  const rejections: Rejection[] = [];

  sheet.value.rows.forEach((cells, index) => {
    const decoded = decodeRow({
      rowNumber: index + 1,
      headers: sheet.value.headers,
      cells,
      cutMonth,
    });
    if (isErr(decoded)) {
      rejections.push(decoded.error);
      return;
    }
    rows.push(decoded.value);
  });

  return Ok({ rows, rejections });
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// The dealer export carries a single worksheet, but it is named inconsistently
// enough that matching on columns beats matching on a name. Ties break on row
// count so a summary tab can never outrank the data.
function selectGpvSheet(
  workbook: WorkBook,
): Result<ExtractedSheet, DomainError> {
  const candidates: ExtractedSheet[] = [];
  for (const name of workbook.SheetNames) {
    const worksheet = workbook.Sheets[name];
    if (!worksheet) continue;
    const extracted = extractSheet(worksheet);
    if (extracted) candidates.push(extracted);
  }

  if (candidates.length === 0) return Err(fail("gpv_no_worksheet"));

  return Ok(
    candidates.reduce((best, sheet) =>
      sheet.rows.length > best.rows.length ? sheet : best,
    ),
  );
}

function extractSheet(worksheet: WorkSheet): ExtractedSheet | null {
  const grid = utils.sheet_to_json<GpvCellValue[]>(worksheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: false,
  });

  for (let index = 0; index < grid.length; index++) {
    const headers = grid[index].map((cell) =>
      normalizeGpvHeader(String(cell ?? "")),
    );
    if (!headerSetHasAll(headers, GPV_REQUIRED_HEADERS)) continue;

    const rows = grid
      .slice(index + 1)
      .filter((row) => row.some((cell) => cell != null && cell !== ""));

    return { headers, rows };
  }

  return null;
}
