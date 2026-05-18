import type { RecordImportType } from "~/features/records-imports/contracts";
import { normalizeCsvHeader } from "~/server/csv/core";
import type { ImportRowInput } from "~/server/integrations/application/import/types";

import type { RecordImportInvalidRow } from "./row-mapper";

export const MAX_RECORD_IMPORT_ROWS = 10_000;

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

export interface ParsedFile {
  importType: RecordImportType;
  validRows: ImportRowInput[];
  invalidRows: RecordImportInvalidRow[];
}

export function normalizeHeader(raw: string): string {
  return normalizeCsvHeader(raw.replace(/^\uFEFF/, ""));
}
