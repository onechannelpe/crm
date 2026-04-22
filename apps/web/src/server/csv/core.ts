export type CsvDelimiter = "," | ";";

export interface CsvRow {
  rowNumber: number;
  cells: string[];
}

export function normalizeCsvHeader(header: string): string {
  return header
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function flushField(cells: string[], field: string): string {
  cells.push(field);
  return "";
}

function isRowEmpty(cells: readonly string[]): boolean {
  return cells.every((cell) => cell.trim().length === 0);
}

function scanCsvRows(
  content: string,
  delimiter: CsvDelimiter,
  onRow: (row: CsvRow) => boolean | void,
): void {
  let inQuotes = false;
  let field = "";
  let currentLine = 1;
  let rowStartLine = 1;
  let cells: string[] = [];

  const emitRow = (): boolean => {
    const row: CsvRow = { rowNumber: rowStartLine, cells: [...cells] };
    const shouldContinue = onRow(row);
    cells = [];
    return shouldContinue !== false;
  };

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];

    if (ch === '"') {
      if (inQuotes && content[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === delimiter) {
      field = flushField(cells, field);
      continue;
    }

    if (ch === "\r" || ch === "\n") {
      const isCrlf = ch === "\r" && content[i + 1] === "\n";
      if (inQuotes) {
        field += "\n";
        if (isCrlf) {
          i++;
        }
        currentLine++;
        continue;
      }

      field = flushField(cells, field);
      if (!emitRow()) {
        return;
      }

      if (isCrlf) {
        i++;
      }
      currentLine++;
      rowStartLine = currentLine;
      continue;
    }

    field += ch;
  }

  if (field.length > 0 || cells.length > 0) {
    field = flushField(cells, field);
    emitRow();
  }
}

export function readFirstNonEmptyCsvRow(
  content: string,
  delimiter: CsvDelimiter,
): CsvRow | null {
  let firstRow: CsvRow | null = null;

  scanCsvRows(content, delimiter, (row) => {
    if (isRowEmpty(row.cells)) {
      return true;
    }

    firstRow = row;
    return false;
  });

  return firstRow;
}

export function countNonEmptyCsvRows(
  content: string,
  delimiter: CsvDelimiter,
  options: { afterRowNumber?: number } = {},
): number {
  const afterRowNumber = options.afterRowNumber ?? 0;
  let count = 0;

  scanCsvRows(content, delimiter, (row) => {
    if (row.rowNumber <= afterRowNumber) {
      return;
    }
    if (isRowEmpty(row.cells)) {
      return;
    }
    count++;
  });

  return count;
}

export function parseCsvRows(
  content: string,
  delimiter: CsvDelimiter,
): CsvRow[] {
  const rows: CsvRow[] = [];
  scanCsvRows(content, delimiter, (row) => {
    rows.push(row);
  });
  return rows;
}
