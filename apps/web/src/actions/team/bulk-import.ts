"use server";

import { validationError } from "~/lib/app-errors";
import { runAction } from "~/server/shared/action-runtime";
import {
  applyBulkImport as applyBulkImportService,
  previewBulkImport as previewBulkImportService,
  type BulkApplyResult,
  type BulkParseResult,
} from "~/server/team/application/bulk-import";

export type { BulkApplyResult } from "~/server/team/application/bulk-import";

import { assertRole } from "./validators";

export interface BulkPreviewResult {
  parsed: BulkParseResult;
}

export async function previewBulkCsv(
  csvContent: string,
  role: string,
): Promise<BulkPreviewResult> {
  if (!csvContent || csvContent.trim().length === 0) {
    throw validationError("CSV content is required");
  }
  const safeRole = assertRole(role);
  const parsed = await runAction({
    actionName: "team.bulk_import.preview",
    permission: "admin:manage",
    input: { role: safeRole },
    execute: () => previewBulkImportService(csvContent),
  });
  return { parsed };
}

export async function applyBulkImport(
  csvContent: string,
  role: string,
): Promise<BulkApplyResult> {
  const safeRole = assertRole(role);
  if (!csvContent || csvContent.trim().length === 0) {
    throw validationError("CSV content is required");
  }
  return runAction({
    actionName: "team.bulk_import.apply",
    permission: "admin:manage",
    input: { role: safeRole },
    execute: (ctx) =>
      applyBulkImportService(ctx, {
        csvContent,
        role: safeRole,
      }),
  });
}
