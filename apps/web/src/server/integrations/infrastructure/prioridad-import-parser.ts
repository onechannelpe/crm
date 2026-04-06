import { parseCsv, validateHeaders } from "~/server/integrations/csv-parser";
import {
  parseLeadPriority,
  type LeadPriority,
} from "~/server/pipeline/domain/lead";

const PRIORIDAD_COLUMNS = [
  "nro_de_solicitud",
  "fecha",
  "usuario",
  "dealer",
  "documento",
  "segmento",
  "prioridad",
  "categoria",
];

export interface ParsedPrioridadRow {
  row: number;
  ruc: string;
  prioridad: LeadPriority;
}

export interface ImportRowFailure {
  row: number;
  ok: false;
  reason: string;
}

function normalizePrioridadRaw(raw: string): string {
  const upper = raw.trim().toUpperCase();
  const first = upper.split(/\s+/)[0];
  if (first === "P1" || first === "P2") return first;
  return upper;
}

export function parsePrioridadImport(text: string): {
  valid: ParsedPrioridadRow[];
  invalid: ImportRowFailure[];
} {
  const parsed = parseCsv(text);
  const headerError = validateHeaders(
    parsed.headers,
    PRIORIDAD_COLUMNS,
    PRIORIDAD_COLUMNS,
  );
  if (headerError) {
    throw new Error(headerError);
  }

  const valid: ParsedPrioridadRow[] = [];
  const invalid: ImportRowFailure[] = [];

  for (const row of parsed.rows) {
    const ruc = row.data["documento"] ?? "";
    const prioridadRaw = normalizePrioridadRaw(row.data["prioridad"] ?? "");

    if (!/^\d+$/.test(ruc)) {
      invalid.push({ row: row.rowNumber, ok: false, reason: "Invalid RUC" });
      continue;
    }

    const prioridad = parseLeadPriority(prioridadRaw);
    if (!prioridad.ok || prioridad.value === undefined) {
      invalid.push({
        row: row.rowNumber,
        ok: false,
        reason: `Invalid prioridad: ${prioridadRaw}`,
      });
      continue;
    }

    valid.push({ row: row.rowNumber, ruc, prioridad: prioridad.value });
  }

  return { valid, invalid };
}
