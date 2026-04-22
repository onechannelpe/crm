import type { LeadImportType } from "~/features/leads-imports/contracts";
import type { CsvDelimiter } from "~/server/csv/core";

export const LEAD_IMPORT_DELIMITERS: readonly CsvDelimiter[] = [
  ",",
  ";",
] as const;
export const MAX_LEAD_IMPORT_ROWS = 10_000;

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

export type LeadImportTypeDetectionErrorCode =
  | "unknown_headers"
  | "ambiguous_headers"
  | "missing_required_headers";

export type LeadImportCsvInspectionResult =
  | {
      ok: true;
      importType: LeadImportType;
      headers: string[];
    }
  | {
      ok: false;
      code: LeadImportTypeDetectionErrorCode;
      message: string;
      headers: string[];
    };

export type LeadImportStreamFactory = () => ReadableStream<Uint8Array>;

export interface HeaderMatch {
  expected: readonly string[];
  missing: string[];
  unknown: string[];
  exact: boolean;
}

export interface HeaderCandidate {
  delimiter: CsvDelimiter;
  headers: string[];
  statusMatch: HeaderMatch;
  priorityMatch: HeaderMatch;
}

export interface ResolvedLayout {
  delimiter: CsvDelimiter;
  headers: string[];
}
