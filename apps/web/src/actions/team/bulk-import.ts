"use server";

import type {
  BulkApplyResult,
  BulkParseResult,
} from "~/actions/team/contracts";
import { isRole, type Role } from "~/lib/auth/access/rbac";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";
import {
  applyBulkImport as applyBulkImportService,
  previewBulkImport as previewBulkImportService,
} from "~/server/team/application/bulk-import";

export interface BulkPreviewResult {
  parsed: BulkParseResult;
}

type BulkImportInput = { csvContent: string; role: Role };

function parseBulkImport(
  csvContent: string,
  role: string,
): Result<BulkImportInput, DomainError> {
  const trimmed = csvContent.trim();
  if (!trimmed) {
    return Err(
      domainError(
        "validation",
        "csv_content_required",
        "CSV content is required",
      ),
    );
  }
  if (!isRole(role)) {
    return Err(domainError("validation", "invalid_role", "role is invalid"));
  }
  return Ok({ csvContent: trimmed, role });
}

export async function previewBulkCsv(
  csvContent: string,
  role: string,
): Promise<BulkPreviewResult> {
  const parsed = await runAction({
    actionName: "team.bulk_import.preview",
    access: { kind: "permission", permission: "admin:manage" },
    parse: () => parseBulkImport(csvContent, role),
    audit: ({ role }) => ({ role }),
    execute: (_ctx, input) =>
      previewBulkImportService(input.csvContent, input.role),
  });
  return { parsed };
}

export async function applyBulkImport(
  csvContent: string,
  role: string,
): Promise<BulkApplyResult> {
  return runAction({
    actionName: "team.bulk_import.apply",
    access: { kind: "permission", permission: "admin:manage" },
    parse: () => parseBulkImport(csvContent, role),
    audit: ({ role }) => ({ role }),
    execute: (ctx, input) =>
      applyBulkImportService(ctx, getServerRuntime().team.invites, {
        csvContent: input.csvContent,
        role: input.role,
      }),
  });
}

export type { BulkApplyResult, BulkParseResult };
