"use server";

import type { Role } from "~/domain/auth/access/rbac";
import { PLATFORM_NAME } from "~/domain/branding";
import { external, type DomainError } from "~/domain/errors";
import { formatAppLongDate } from "~/domain/time/app-time";
import type { MessagingGateway } from "~/server/notifications/channels/messaging-gateway";
import type { InviteDelivery } from "~/server/team/application/ports";
import { Err, Ok, type Result } from "~/shared/result";

async function sendInviteEmail(
  messaging: MessagingGateway,
  params: {
    email: string;
    fullName: string;
    role: Role;
    inviteUrl: string;
    expiresAt: Date;
  },
): Promise<Result<void, DomainError>> {
  const sent = await messaging.sendInviteEmail({
    to: params.email,
    params: {
      fullName: params.fullName,
      role: params.role,
      inviteUrl: params.inviteUrl,
      expiresAt: formatAppLongDate(params.expiresAt.getTime() - 1),
      platformName: PLATFORM_NAME,
    },
  });
  if (!sent.ok) {
    return Err(external(sent.error.message, { code: sent.error.code }));
  }
  return Ok(undefined);
}

export function createInviteDelivery(
  messaging: MessagingGateway,
): InviteDelivery {
  return {
    send(input) {
      return sendInviteEmail(messaging, input);
    },
  };
}
