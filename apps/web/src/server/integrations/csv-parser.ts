export interface ParsedRow {
  rowNumber: number;
  data: Record<string, string>;
}

export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
  error?: string;
}

function detectDelimiter(firstLine: string): "," | ";" {
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

/**
 * Normalizes a CSV header to a stable key:
 * - strips accent marks
 * - removes parenthetical content e.g. "(RUC)"
 * - lowercases
 * - replaces runs of whitespace with underscores
 */
export function normalizeHeader(h: string): string {
  return h
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function parseLine(line: string, delimiter: "," | ";"): string[] {
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
    } else if (ch === delimiter && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

export function parseCsv(content: string): ParseResult {
  const lines = content.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return { headers: [], rows: [], error: "Empty file" };

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseLine(lines[0], delimiter).map(normalizeHeader);
  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i], delimiter);
    const data: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      data[headers[j]] = (values[j] ?? "").trim();
    }
    rows.push({ rowNumber: i + 1, data });
  }

  return { headers, rows };
}

export function validateHeaders(
  headers: string[],
  required: string[],
  allowed: string[],
): string | null {
  for (const req of required) {
    if (!headers.includes(req)) return `Missing required column: ${req}`;
  }
  for (const h of headers) {
    if (!allowed.includes(h)) return `Unknown column: ${h}`;
  }
  return null;
}
