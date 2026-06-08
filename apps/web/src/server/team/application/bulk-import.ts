import type {
  BulkApplyResult,
  BulkParseResult,
} from "~/contracts/team/bulk-import";
import type { Role } from "~/lib/auth/access/rbac";
import { shortName } from "~/lib/users/display-name";
import type { AppContext } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import {
  applyImport,
  parseAndValidateCsvRows,
} from "~/server/users/service-bulk-import";

import type { TeamInviteProvisioningContext } from "../infrastructure/invite-context";
import {
  buildInviteUrl,
  sendInviteEmail,
} from "../infrastructure/invite-delivery";

export async function previewBulkImport(
  csvContent: string,
  role: Role,
): Promise<Result<BulkParseResult, DomainError>> {
  const parsed = parseAndValidateCsvRows(csvContent, role);
  if (!parsed.ok) {
    return {
      ok: false,
      error: {
        kind: "validation",
        code: "team.bulk_import.csv_invalid",
        message: parsed.error.message,
      },
    };
  }
  return Ok(parsed.value);
}

export async function applyBulkImport(
  ctx: AppContext,
  deps: TeamInviteProvisioningContext,
  input: {
    csvContent: string;
    role: Role;
  },
): Promise<Result<BulkApplyResult, DomainError>> {
  const parsed = await previewBulkImport(input.csvContent, input.role);
  if (!parsed.ok) {
    return parsed;
  }

  if (parsed.value.valid.length === 0) {
    return {
      ok: false,
      error: {
        kind: "validation",
        code: "team.bulk_import.no_valid_rows",
        message: "No valid rows to import",
      },
    };
  }

  const result = await applyImport(
    parsed.value.valid,
    {
      userId: ctx.actor.userId,
      role: ctx.actor.role,
      branchId: ctx.actor.branchId,
    },
    input.role,
    deps.inviteService,
    async ({ row, inviteId, token, expiresAt }) => {
      await sendInviteEmail({
        email: row.email,
        fullName: shortName({
          names: row.names,
          firstSurname: row.firstSurname,
          secondSurname: row.secondSurname,
        }),
        role: input.role,
        inviteUrl: buildInviteUrl(token),
        expiresAt,
      });
      await deps.inviteService.markInviteDelivered(inviteId);
    },
  );

  return Ok(result);
}
