import type {
  BulkApplyResult,
  BulkParseResult,
} from "~/contracts/team/bulk-import";
import type { Role } from "~/lib/auth/access/rbac";
import { shortName } from "~/lib/users/display-name";
import { inviteLink } from "~/server/invites/domain/invite-link";
import type { AppContext } from "~/server/platform/action/context";
import { invalid, type DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";
import {
  applyImport,
  parseAndValidateCsvRows,
} from "~/server/users/service-bulk-import";

import type { TeamBulkImportContext } from "../infrastructure/invite-context";
import { sendInviteEmail } from "../infrastructure/invite-delivery";

export async function previewBulkImport(
  csvContent: string,
  role: Role,
): Promise<Result<BulkParseResult, DomainError>> {
  const parsed = parseAndValidateCsvRows(csvContent, role);
  if (!parsed.ok) {
    return Err(
      invalid({
        code: "team.bulk_import.csv_invalid",
        details: { parseError: parsed.error.message },
      }),
    );
  }
  return Ok(parsed.value);
}

export async function applyBulkImport(
  ctx: AppContext,
  deps: TeamBulkImportContext,
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
    return Err(invalid({ code: "team.bulk_import.no_valid_rows" }));
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
      const emailResult = await sendInviteEmail({
        email: row.email,
        fullName: shortName({
          names: row.names,
          firstSurname: row.firstSurname,
          secondSurname: row.secondSurname,
        }),
        role: input.role,
        inviteUrl: inviteLink(deps.publicOrigin, token),
        expiresAt,
      });
      // Re-throw failures: applyImport's per-row loop catches into rowErrors,
      // so a Result check here could not signal the loop.
      if (isErr(emailResult)) {
        const { error } = emailResult;
        const message =
          error.kind === "external" || error.kind === "internal"
            ? error.internalMessage
            : (error.code ?? error.kind);
        throw new Error(message);
      }
      await deps.inviteService.markInviteDelivered(inviteId);
    },
  );

  return Ok(result);
}
