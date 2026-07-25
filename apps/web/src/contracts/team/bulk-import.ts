import type { ExecutiveCategory } from "~/domain/identity/executive-category";
import type { CalendarDate } from "~/domain/time/calendar-date";

export interface BulkImportRow {
  firstSurname: string;
  secondSurname: string;
  names: string;
  email: string;
  expiresOn: CalendarDate | null;
  executiveCategory: ExecutiveCategory | null;
}

export type BulkRowError = {
  row: number;
  message: string;
};

export interface BulkParseResult {
  valid: BulkImportRow[];
  errors: BulkRowError[];
}

export interface BulkPreviewResult {
  parsed: BulkParseResult;
}

export interface BulkApplyResult {
  created: number;
  skipped: number;
  rowErrors: string[];
}
