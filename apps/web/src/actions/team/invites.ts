"use server";

import {
  createNotificationService,
  renderInviteEmail,
} from "@crm/notifications";
import { getRequestEvent } from "solid-js/web";

import type { Role } from "~/lib/auth/access/rbac";
import { requirePermission } from "~/lib/auth/access/session";
import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import { env } from "~/lib/env";
import { runObservedAction } from "~/lib/observability/run-observed-action";
import { repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

import { provisioning } from "./provisioning";
import { assertEmail, assertOptionalTeamId, assertRole } from "./validators";

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

async function sendInviteEmail(params: {
  email: string;
  fullName: string;
  role: Role;
  inviteUrl: string;
  expiresAt: number;
}): Promise<void> {
  const { html, text } = renderInviteEmail({
    fullName: params.fullName,
    role: params.role,
    inviteUrl: params.inviteUrl,
    expiresAt: params.expiresAt,
  });

  await notificationSender.send({
    channel: "email",
    to: params.email,
    subject: "Activa tu acceso al CRM",
    html,
    text,
  });
}

export async function createTeamInvite(input: {
  fullName: string;
  email: string;
  role: string;
  teamId?: number | null;
}): Promise<{ inviteId: number }> {
  const safeInput = {
    fullName: assertNonEmptyString(input.fullName, "fullName"),
    email: assertEmail(input.email),
    role: assertRole(input.role),
    teamId: assertOptionalTeamId(input.teamId),
  };

  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "team.invite.create",
    actor,
    input: {
      role: safeInput.role,
      hasTeamId: safeInput.teamId !== null,
    },
    run: async () => {
      const session = await requirePermission("hr:manage");
      actor.userId = session.userId;
      actor.role = session.role;
      const result = await provisioning.createInvite({
        actorUserId: session.userId,
        actorRole: session.role,
        branchId: session.branchId,
        fullName: safeInput.fullName,
        email: safeInput.email,
        role: safeInput.role,
        teamId: safeInput.teamId,
      });
      if (isErr(result)) {
        throw new Error(result.error);
      }

      await sendInviteEmail({
        email: safeInput.email,
        fullName: safeInput.fullName,
        role: safeInput.role,
        inviteUrl: getInviteUrl(result.value.token),
        expiresAt: result.value.expiresAt,
      });
      await provisioning.markInviteDelivered(result.value.inviteId);

      return { inviteId: result.value.inviteId };
    },
  });
}

export async function resendTeamInvite(inviteId: number): Promise<void> {
  const safeInviteId = assertPositiveInt(inviteId, "inviteId");
  const actor = { userId: null as number | null, role: null as Role | null };
  await runObservedAction({
    actionName: "team.invite.resend",
    actor,
    input: { inviteId: safeInviteId },
    run: async () => {
      const session = await requirePermission("hr:manage");
      actor.userId = session.userId;
      actor.role = session.role;

      const result = await provisioning.resendInvite({
        actorUserId: session.userId,
        actorRole: session.role,
        branchId: session.branchId,
        inviteId: safeInviteId,
      });
      if (isErr(result)) {
        throw new Error(result.error);
      }

      const invite = await repos.userInvites.findById(result.value.inviteId);
      const user = invite ? await repos.users.findById(invite.user_id) : null;
      if (!user) {
        throw new Error("Invite target user was not found");
      }

      await sendInviteEmail({
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        inviteUrl: getInviteUrl(result.value.token),
        expiresAt: result.value.expiresAt,
      });
      await provisioning.markInviteDelivered(result.value.inviteId);
    },
  });
}

export async function revokeTeamInvite(inviteId: number): Promise<void> {
  const safeInviteId = assertPositiveInt(inviteId, "inviteId");
  const actor = { userId: null as number | null, role: null as Role | null };
  await runObservedAction({
    actionName: "team.invite.revoke",
    actor,
    input: { inviteId: safeInviteId },
    run: async () => {
      const session = await requirePermission("hr:manage");
      actor.userId = session.userId;
      actor.role = session.role;
      const result = await provisioning.revokeInvite({
        actorUserId: session.userId,
        actorRole: session.role,
        branchId: session.branchId,
        inviteId: safeInviteId,
      });
      if (isErr(result)) {
        throw new Error(result.error);
      }
    },
  });
}
