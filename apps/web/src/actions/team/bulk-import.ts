"use server";

import type {
  BulkApplyResult,
  BulkPreviewResult,
} from "~/contracts/team/bulk-import";
import { ROLES } from "~/domain/auth/access/rbac";
import { runAction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { getTeamRuntime } from "~/server/platform/container/team-runtime";
import {
  applyBulkImport as applyBulkImportService,
  previewBulkImport as previewBulkImportService,
} from "~/server/team/application/bulk-import";

export async function previewBulkCsv(
  csvContent: unknown,
  role: unknown,
): Promise<BulkPreviewResult> {
  const parsed = await runAction({
    name: "team.bulk_import.preview",
    access: { kind: "permission", permission: "admin:manage" },

    parse: () =>
      parseObject({ csvContent, role }, validationFail, (r) => ({
        csvContent: r.str("csvContent"),
        role: r.enum("role", ROLES),
      })),

    audit: (input) => ({ role: input.role }),

    execute: (ctx, input) =>
      previewBulkImportService(input.csvContent, input.role, ctx.now()),
  });

  return { parsed };
}

export async function applyBulkImport(
  csvContent: unknown,
  role: unknown,
): Promise<BulkApplyResult> {
  return runAction({
    name: "team.bulk_import.apply",
    access: { kind: "permission", permission: "admin:manage" },

    parse: () =>
      parseObject({ csvContent, role }, validationFail, (r) => ({
        csvContent: r.str("csvContent"),
        role: r.enum("role", ROLES),
      })),

    audit: (input) => ({ role: input.role }),

    execute: (ctx, input) =>
      applyBulkImportService(ctx, getTeamRuntime().invites, {
        csvContent: input.csvContent,
        role: input.role,
      }),
  });
}
