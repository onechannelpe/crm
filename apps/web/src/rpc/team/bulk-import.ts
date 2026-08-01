import type {
  BulkApplyResult,
  BulkPreviewResult,
} from "~/contracts/team/bulk-import";
import { ROLES } from "~/domain/auth/access/rbac";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { application } from "~/server/platform/composition/application";
import { previewBulkImport as previewBulkImportService } from "~/server/team/application/bulk-import";

export async function previewBulkCsv(
  csvContent: unknown,
  role: unknown,
): Promise<BulkPreviewResult> {
  "use server";

  const parsed = await executeSessionServerFunction({
    name: "team.bulk_import.preview",
    access: { kind: "permission", permission: "admin:manage" },

    parse: () =>
      parseObject({ csvContent, role }, validationFail, (r) => ({
        csvContent: r.str("csvContent"),
        role: r.enum("role", ROLES),
      })),

    audit: (input) => ({ role: input.role }),

    execute: (ctx, input) =>
      previewBulkImportService(input.csvContent, input.role, ctx.operationAt),
  });

  return { parsed };
}

export async function applyBulkImport(
  csvContent: unknown,
  role: unknown,
): Promise<BulkApplyResult> {
  "use server";

  return executeSessionServerFunction({
    name: "team.bulk_import.apply",
    access: { kind: "permission", permission: "admin:manage" },

    parse: () =>
      parseObject({ csvContent, role }, validationFail, (r) => ({
        csvContent: r.str("csvContent"),
        role: r.enum("role", ROLES),
      })),

    audit: (input) => ({ role: input.role }),

    execute: (ctx, input) =>
      application.team.invites.applyBulkImport(ctx, {
        csvContent: input.csvContent,
        role: input.role,
      }),
  });
}
