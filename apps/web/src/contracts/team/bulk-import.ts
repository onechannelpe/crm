import type { ExecutiveCategoryValue } from "~/lib/db/types";

export interface BulkImportRow {
  firstSurname: string;
  secondSurname: string;
  names: string;
  email: string;
  expiresAt: number | null;
  executiveCategory: ExecutiveCategoryValue | null;
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
