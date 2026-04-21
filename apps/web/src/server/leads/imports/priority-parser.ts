import {
  parsePrioridadImport as parsePrioridadImportImpl,
  type ParsedPrioridadRow,
} from "~/server/integrations/infrastructure/prioridad-import-parser";

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

export type { ParsedPrioridadRow };

export function parsePriorityImport(text: string): {
  valid: ParsedPrioridadRow[];
  invalid: Array<{ row: number; ok: false; reason: string }>;
} {
  return parsePrioridadImportImpl(text);
}
