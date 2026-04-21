import {
  parseStatusImport as parseStatusImportImpl,
  type ParsedStatusRow,
} from "~/server/integrations/infrastructure/status-import-parser";

export const STATUS_IMPORT_HEADERS = [
  "nro_de_solicitud",
  "fecha_de_solicitud",
  "canal",
  "nombre_de_agencia_dealer",
  "documento",
  "resultado",
] as const;

export type { ParsedStatusRow };

export function parseStatusImport(text: string): {
  valid: ParsedStatusRow[];
  invalid: Array<{ row: number; ok: false; reason: string }>;
} {
  return parseStatusImportImpl(text);
}
