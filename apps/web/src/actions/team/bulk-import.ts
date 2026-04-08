"use server";

import type {
  BulkApplyResult,
  BulkParseResult,
} from "~/actions/team/contracts";
import { validationError } from "~/lib/app-errors";
import { runAction } from "~/server/shared/action-runtime";
import {
  applyBulkImport as applyBulkImportService,
  previewBulkImport as previewBulkImportService,
} from "~/server/team/application/bulk-import";
import { createTeamInviteContext } from "~/server/team/infrastructure/invite-context";

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
    access: { kind: "permission", permission: "admin:manage" },
    input: { role: safeRole },
    execute: () => previewBulkImportService(csvContent, safeRole),
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
    access: { kind: "permission", permission: "admin:manage" },
    input: { role: safeRole },
    execute: (ctx) =>
      applyBulkImportService(ctx, createTeamInviteContext(), {
        csvContent,
        role: safeRole,
      }),
  });
}

export type { BulkApplyResult, BulkParseResult };
