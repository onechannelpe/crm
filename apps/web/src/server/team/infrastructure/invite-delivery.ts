"use server";

import type { Role } from "~/lib/auth/access/rbac";
import { config } from "~/lib/config";
import { APP_LOCALE } from "~/lib/locale";
import { getServerRuntime } from "~/server/platform/container";
import { external, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

export async function sendInviteEmail(params: {
  email: string;
  fullName: string;
  role: Role;
  inviteUrl: string;
  expiresAt: Date;
}): Promise<Result<void, DomainError>> {
  const sent = await getServerRuntime().notifications.messaging.sendInviteEmail(
    {
      to: params.email,
      params: {
        fullName: params.fullName,
        role: params.role,
        inviteUrl: params.inviteUrl,
        expiresAt: params.expiresAt.toLocaleDateString(APP_LOCALE, {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        platformName: config.branding.platformName,
      },
    },
  );
  if (!sent.ok) {
    return Err(external(sent.error.message, { code: sent.error.code }));
  }
  return Ok(undefined);
}
