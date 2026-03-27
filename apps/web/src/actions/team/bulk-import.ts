"use server";

import { internalError, validationError } from "~/lib/app-errors";
import type { Role } from "~/lib/auth/access/rbac";
import { requirePermission } from "~/lib/auth/access/session";
import { runObservedAction } from "~/lib/observability/run-observed-action";
import { shortName } from "~/lib/users/display-name";
import { isErr } from "~/server/shared/result";
import {
  applyImport,
  parseAndValidateCsvRows,
  type BulkApplyResult,
  type BulkParseResult,
} from "~/server/users/service-bulk-import";

export type { BulkApplyResult } from "~/server/users/service-bulk-import";
import { provisioning } from "~/server/team/provisioning";

import { getInviteUrl, sendInviteEmail } from "./utils";
import { assertRole } from "./validators";

export interface BulkPreviewResult {
  parsed: BulkParseResult;
}

export async function previewBulkCsv(
  csvContent: string,
  role: string,
): Promise<BulkPreviewResult> {
  await requirePermission("admin:manage");
  assertRole(role);

  if (!csvContent || csvContent.trim().length === 0) {
    throw validationError("CSV content is required");
  }

  const result = parseAndValidateCsvRows(csvContent);
  if (isErr(result)) {
    throw validationError(result.error.message);
  }

  return { parsed: result.value };
}

export async function applyBulkImport(
  csvContent: string,
  role: string,
): Promise<BulkApplyResult> {
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "team.bulk_import.apply",
    actor,
    input: { role },
    run: async () => {
      const session = await requirePermission("admin:manage");
      actor.userId = session.userId;
      actor.role = session.role;

      const safeRole = assertRole(role);

      if (!csvContent || csvContent.trim().length === 0) {
        throw validationError("CSV content is required");
      }

      const parseResult = parseAndValidateCsvRows(csvContent);
      if (isErr(parseResult)) {
        throw internalError(parseResult.error.message);
      }

      const { valid } = parseResult.value;
      if (valid.length === 0) {
        throw validationError("No valid rows to import");
      }

      return applyImport(
        valid,
        {
          userId: session.userId,
          role: session.role,
          branchId: session.branchId,
        },
        safeRole,
        provisioning,
        async ({ row, inviteId, token, expiresAt }) => {
          await sendInviteEmail({
            email: row.email,
            fullName: shortName({
              names: row.names,
              firstSurname: row.firstSurname,
              secondSurname: row.secondSurname,
            }),
            role: safeRole,
            inviteUrl: getInviteUrl(token),
            expiresAt,
          });
          await provisioning.markInviteDelivered(inviteId);
        },
      );
    },
  });
}
