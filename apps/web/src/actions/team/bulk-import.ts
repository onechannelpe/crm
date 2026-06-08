"use server";

import type {
  BulkApplyResult,
  BulkParseResult,
} from "~/actions/team/contracts";
import { ROLES, type Role } from "~/lib/auth/access/rbac";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import { parseObject, validationFail } from "~/server/shared/parsing";
import type { Result } from "~/server/shared/result";
import {
  applyBulkImport as applyBulkImportService,
  previewBulkImport as previewBulkImportService,
} from "~/server/team/application/bulk-import";

export interface BulkPreviewResult {
  parsed: BulkParseResult;
}

type BulkImportInput = { csvContent: string; role: Role };

function parseBulkImport(
  csvContent: unknown,
  role: unknown,
): Result<BulkImportInput, DomainError> {
  return parseObject({ csvContent, role }, validationFail, (r) => ({
    csvContent: r.str("csvContent"),
    role: r.enum("role", ROLES),
  }));
}

export async function previewBulkCsv(
  csvContent: unknown,
  role: unknown,
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
  csvContent: unknown,
  role: unknown,
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
