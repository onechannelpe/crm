"use server";

import {
  createNotificationService,
  renderInviteEmail,
} from "@crm/notifications";
import { getRequestEvent } from "solid-js/web";

import { internalError, validationError } from "~/lib/app-errors";
import type { Role } from "~/lib/auth/access/rbac";
import { requirePermission } from "~/lib/auth/access/session";
import { env } from "~/lib/env";
import { runObservedAction } from "~/lib/observability/run-observed-action";
import { shortName } from "~/lib/users/display-name";
import { isErr } from "~/server/shared/result";
import {
  parseAndValidateCsvRows,
  type BulkParseResult,
} from "~/server/users/service-bulk-import";

import { provisioning } from "./provisioning";
import { assertRole } from "./validators";

const notificationSender = createNotificationService({
  resendApiKey: env.resendApiKey || undefined,
  fromEmail: env.emailFrom || undefined,
  whatsappAccessToken: env.whatsappAccessToken || undefined,
  whatsappPhoneNumberId: env.whatsappPhoneNumberId || undefined,
  whatsappApiVersion: env.whatsappApiVersion || undefined,
});

function getInviteUrl(token: string): string {
  const event = getRequestEvent();
  const requestUrl = event?.request.url;
  if (!requestUrl) {
    return `/auth/invite/${token}`;
  }
  const origin = new URL(requestUrl).origin;
  return `${origin}/auth/invite/${token}`;
}

export interface BulkPreviewResult {
  parsed: BulkParseResult;
}

export interface BulkApplyResult {
  created: number;
  skipped: number;
  rowErrors: string[];
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

      let created = 0;
      let skipped = 0;
      const rowErrors: string[] = [];

      for (const row of valid) {
        // eslint-disable-next-line no-await-in-loop
        const result = await provisioning.createInvite({
          actorUserId: session.userId,
          actorRole: session.role,
          branchId: session.branchId,
          names: row.names,
          firstSurname: row.firstSurname,
          secondSurname: row.secondSurname,
          email: row.email,
          role: safeRole,
          teamId: null,
          expiresAt: row.expiresAt,
        });
        if (isErr(result)) {
          if (
            result.error.reason === "active_user_exists" ||
            result.error.reason === "pending_user_other_branch"
          ) {
            skipped++;
          } else {
            rowErrors.push(`${row.email}: ${result.error.message}`);
          }
          continue;
        }

        const { html, text } = renderInviteEmail({
          fullName: shortName({
            names: row.names,
            firstSurname: row.firstSurname,
            secondSurname: row.secondSurname,
          }),
          role: safeRole,
          inviteUrl: getInviteUrl(result.value.token),
          expiresAt: new Date(result.value.expiresAt).toLocaleDateString(
            "es-MX",
            { year: "numeric", month: "long", day: "numeric" },
          ),
        });
        // eslint-disable-next-line no-await-in-loop
        await notificationSender.send({
          channel: "email",
          to: row.email,
          subject: "Activa tu acceso al CRM",
          html,
          text,
        });
        // eslint-disable-next-line no-await-in-loop
        await provisioning.markInviteDelivered(result.value.inviteId);
        created++;
      }

      return { created, skipped, rowErrors };
    },
  });
}
