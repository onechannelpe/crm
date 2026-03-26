import { toLeadStatus } from "~/lib/db/types";
import type { LeadStatus } from "~/lib/db/types";
import { parseCsv, validateHeaders } from "~/server/integrations/csv-parser";

const STATUS_COLUMNS = [
  "nro_de_solicitud",
  "fecha_de_solicitud",
  "canal",
  "nombre_de_agencia_dealer",
  "documento",
  "resultado",
];

export interface ParsedStatusRow {
  row: number;
  ruc: string;
  status: LeadStatus;
}

export interface ImportRowFailure {
  row: number;
  ok: false;
  reason: string;
}

function normalizeStatusRaw(raw: string): string {
  return raw.trim().toUpperCase();
}

export function parseStatusImport(text: string): {
  valid: ParsedStatusRow[];
  invalid: ImportRowFailure[];
} {
  const parsed = parseCsv(text);
  const headerError = validateHeaders(
    parsed.headers,
    STATUS_COLUMNS,
    STATUS_COLUMNS,
  );
  if (headerError) {
    throw new Error(headerError);
  }

  const valid: ParsedStatusRow[] = [];
  const invalid: ImportRowFailure[] = [];

  for (const row of parsed.rows) {
    const ruc = row.data["documento"] ?? "";
    const statusRaw = normalizeStatusRaw(row.data["resultado"] ?? "");

    if (!/^\d+$/.test(ruc)) {
      invalid.push({ row: row.rowNumber, ok: false, reason: "Invalid RUC" });
      continue;
    }

    const status = toLeadStatus(statusRaw);
    if (!status) {
      invalid.push({
        row: row.rowNumber,
        ok: false,
        reason: `Invalid resultado: ${statusRaw}`,
      });
      continue;
    }

    valid.push({ row: row.rowNumber, ruc, status });
  }

  return { valid, invalid };
}
