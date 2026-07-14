import { read, utils, type WorkBook, type WorkSheet } from "xlsx";

import { cellDateOrNull, firstOfMonth, saleMonthFromAnomes } from "./cells";
import {
  GPV_COLUMNS,
  GPV_ENRICHMENT_HEADERS,
  GPV_REQUIRED_HEADERS,
  headerSetHasAll,
  normalizeGpvHeader,
  type GpvCellValue,
  type ParsedGpvReport,
  type InvalidGpvRow,
  type MappedGpvRow,
} from "./contracts";
import { mapGpvRow } from "./map-row";

interface ExtractedSheet {
  headers: string[];
  rows: GpvCellValue[][];
  hasEnrichment: boolean;
}

// A GPV workbook can hold several sheets: the raw dealer file has one (BASE),
// the team-enriched file adds a working sheet (ZONAL / VENDEDOR R / PROYECTADO)
// alongside BASE and pivots. Pick the sheet that carries the report columns and
// prefer one that also carries enrichment, so a raw upload lands on BASE and an
// enriched upload lands on the working sheet. Ties break on row count.
export function fromGpvXlsx(buffer: ArrayBuffer): ParsedGpvReport {
  const workbook = read(buffer, { type: "array", cellDates: true });
  const sheet = selectGpvSheet(workbook);
  if (!sheet) {
    throw new Error("No worksheet matches the GPV report columns");
  }

  const cutDate = inferCutDate(sheet);
  const cutMonth = firstOfMonth(cutDate);

  const validRows: MappedGpvRow[] = [];
  const invalidRows: InvalidGpvRow[] = [];

  sheet.rows.forEach((cells, index) => {
    const result = mapGpvRow({
      rowNumber: index + 1,
      headers: sheet.headers,
      cells,
      cutMonth,
    });
    if (result.ok) {
      validRows.push(result.row);
    } else {
      invalidRows.push(result.row);
    }
  });

  return {
    cutDate,
    hasEnrichment: sheet.hasEnrichment,
    validRows,
    invalidRows,
  };
}

function selectGpvSheet(workbook: WorkBook): ExtractedSheet | null {
  const candidates: ExtractedSheet[] = [];
  for (const name of workbook.SheetNames) {
    const worksheet = workbook.Sheets[name];
    if (!worksheet) continue;
    const extracted = extractSheet(worksheet);
    if (extracted) candidates.push(extracted);
  }
  if (candidates.length === 0) return null;

  const enriched = candidates.filter((sheet) => sheet.hasEnrichment);
  const pool = enriched.length > 0 ? enriched : candidates;
  return pool.reduce((best, sheet) =>
    sheet.rows.length > best.rows.length ? sheet : best,
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

    return {
      headers,
      rows,
      hasEnrichment: headerSetHasAll(headers, GPV_ENRICHMENT_HEADERS),
    };
  }

  return null;
}

// cut_date is the snapshot "AL" date: the latest transaction across the file.
// Prefer ultima_trx wholesale; only when the file carries no transaction dates
// at all fall back to the latest sale month, then today.
function inferCutDate(sheet: ExtractedSheet): string {
  const today = new Date().toISOString().slice(0, 10);
  const lastTrxIndex = sheet.headers.indexOf(GPV_COLUMNS.lastTransactionAt);
  if (lastTrxIndex >= 0) {
    const latest = maxBy(sheet.rows, (row) =>
      cellDateOrNull(row[lastTrxIndex]),
    );
    // A snapshot cannot be dated in the future; team-entered dates in the
    // enriched file occasionally are, so cap at today.
    if (latest) return latest > today ? today : latest;
  }

  const saleMonthIndex = sheet.headers.indexOf(GPV_COLUMNS.saleMonth);
  if (saleMonthIndex >= 0) {
    const latest = maxBy(sheet.rows, (row) =>
      saleMonthFromAnomes(row[saleMonthIndex]),
    );
    if (latest) return latest > today ? today : latest;
  }

  return today;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function maxBy(
  rows: readonly GpvCellValue[][],
  pick: (row: GpvCellValue[]) => string | null,
): string | null {
  let latest: string | null = null;
  for (const row of rows) {
    const candidate = pick(row);
    if (
      candidate &&
      ISO_DATE.test(candidate) &&
      (latest === null || candidate > latest)
    ) {
      latest = candidate;
    }
  }
  return latest;
}
