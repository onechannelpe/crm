import { shortName } from "~/lib/users/display-name";
import type { AppContext } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";
import {
  applyImport,
  parseAndValidateCsvRows,
  type BulkApplyResult,
  type BulkParseResult,
} from "~/server/users/service-bulk-import";
import type { createUserProvisioningService } from "~/server/users/service-user-provisioning";

import type { CreateTeamInviteCommand } from "./types";

type TeamBulkProvisioning = Pick<
  ReturnType<typeof createUserProvisioningService>,
  "createInvite" | "markInviteDelivered"
>;

export async function previewBulkImport(
  csvContent: string,
): Promise<Result<BulkParseResult, DomainError>> {
  const parsed = parseAndValidateCsvRows(csvContent);
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
  input: {
    csvContent: string;
    role: CreateTeamInviteCommand["role"];
  },
  deps: {
    provisioning: TeamBulkProvisioning;
    sendInviteEmail: (input: {
      email: string;
      fullName: string;
      role: CreateTeamInviteCommand["role"];
      inviteUrl: string;
      expiresAt: number;
    }) => Promise<void>;
    getInviteUrl: (token: string) => string;
  },
): Promise<Result<BulkApplyResult, DomainError>> {
  const parsed = await previewBulkImport(input.csvContent);
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
    deps.provisioning,
    async ({ row, inviteId, token, expiresAt }) => {
      await deps.sendInviteEmail({
        email: row.email,
        fullName: shortName({
          names: row.names,
          firstSurname: row.firstSurname,
          secondSurname: row.secondSurname,
        }),
        role: input.role,
        inviteUrl: deps.getInviteUrl(token),
        expiresAt,
      });
      await deps.provisioning.markInviteDelivered(inviteId);
    },
  );

  return Ok(result);
}

export type { BulkApplyResult, BulkParseResult };
