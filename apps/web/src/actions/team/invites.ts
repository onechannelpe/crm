"use server";

import {
  createNotificationService,
  renderInviteEmail,
} from "@crm/notifications";
import { getRequestEvent } from "solid-js/web";

import {
  conflictError,
  forbiddenError,
  internalError,
  notFoundError,
  validationError,
} from "~/lib/app-errors";
import type { Role } from "~/lib/auth/access/rbac";
import { requirePermission } from "~/lib/auth/access/session";
import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import { env } from "~/lib/env";
import { runObservedAction } from "~/lib/observability/run-observed-action";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import { shortName } from "~/lib/users/display-name";
import { repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";
import type {
  CreateInviteError,
  MarkInviteDeliveredError,
  ResendInviteError,
  RevokeInviteError,
} from "~/server/users/service-user-provisioning";

import { provisioning } from "./provisioning";
import {
  assertEmail,
  assertOptionalExpiresAt,
  assertOptionalTeamId,
  assertRole,
} from "./validators";

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
    expiresAt: new Date(params.expiresAt).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  });

  await notificationSender.send({
    channel: "email",
    to: params.email,
    subject: "Activa tu acceso al CRM",
    html,
    text,
  });
}

function throwCreateInviteError(error: CreateInviteError): never {
  switch (error.reason) {
    case "role_not_assignable":
      throw forbiddenError(error.message);
    case "invalid_team":
      throw validationError(error.message);
    case "active_user_exists":
      throw conflictError(error.message);
    case "pending_user_other_branch":
      throw forbiddenError(error.message);
    case "invite_target_missing":
      throw notFoundError(error.message);
    case "unexpected":
      throw internalError(error.message);
    default: {
      const exhausted: never = error;
      throw internalError(
        `Unhandled invite create error: ${String(exhausted)}`,
      );
    }
  }
}

function throwResendInviteError(error: ResendInviteError): never {
  switch (error.reason) {
    case "invite_not_found":
    case "invite_target_missing":
      throw notFoundError(error.message);
    case "cross_branch_forbidden":
    case "role_not_assignable":
      throw forbiddenError(error.message);
    case "invite_not_pending":
    case "invite_target_active":
      throw conflictError(error.message);
    case "unexpected":
      throw internalError(error.message);
    default: {
      const exhausted: never = error;
      throw internalError(
        `Unhandled invite resend error: ${String(exhausted)}`,
      );
    }
  }
}

function throwRevokeInviteError(error: RevokeInviteError): never {
  switch (error.reason) {
    case "invite_not_found":
    case "invite_target_missing":
      throw notFoundError(error.message);
    case "cross_branch_forbidden":
    case "role_not_assignable":
      throw forbiddenError(error.message);
    case "invite_not_pending":
      throw conflictError(error.message);
    case "unexpected":
      throw internalError(error.message);
    default: {
      const exhausted: never = error;
      throw internalError(
        `Unhandled invite revoke error: ${String(exhausted)}`,
      );
    }
  }
}

function throwMarkInviteDeliveredError(error: MarkInviteDeliveredError): never {
  switch (error.reason) {
    case "unexpected":
      throw internalError(error.message);
    default: {
      const exhausted: never = error.reason;
      throw internalError(
        `Unhandled invite delivery mark error: ${String(exhausted)}`,
      );
    }
  }
}

export async function createTeamInvite(input: {
  names: string;
  firstSurname: string;
  secondSurname: string;
  email: string;
  role: string;
  teamId?: number | null;
  expiresAt?: number | null;
}): Promise<{ inviteId: number }> {
  const safeInput = {
    names: assertNonEmptyString(input.names, "names"),
    firstSurname: assertNonEmptyString(input.firstSurname, "firstSurname"),
    secondSurname: assertNonEmptyString(input.secondSurname, "secondSurname"),
    email: assertEmail(input.email),
    role: assertRole(input.role),
    teamId: assertOptionalTeamId(input.teamId),
    expiresAt: assertOptionalExpiresAt(input.expiresAt),
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
      await checkActionRateLimit("team.invite.create", session.userId, repos);
      const result = await provisioning.createInvite({
        actorUserId: session.userId,
        actorRole: session.role,
        branchId: session.branchId,
        names: safeInput.names,
        firstSurname: safeInput.firstSurname,
        secondSurname: safeInput.secondSurname,
        email: safeInput.email,
        role: safeInput.role,
        teamId: safeInput.teamId,
        expiresAt: safeInput.expiresAt,
      });
      if (isErr(result)) {
        throwCreateInviteError(result.error);
      }

      await sendInviteEmail({
        email: safeInput.email,
        fullName: shortName({
          names: safeInput.names,
          firstSurname: safeInput.firstSurname,
          secondSurname: safeInput.secondSurname,
        }),
        role: safeInput.role,
        inviteUrl: getInviteUrl(result.value.token),
        expiresAt: result.value.expiresAt,
      });
      const deliveryResult = await provisioning.markInviteDelivered(
        result.value.inviteId,
      );
      if (isErr(deliveryResult)) {
        throwMarkInviteDeliveredError(deliveryResult.error);
      }

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
        throwResendInviteError(result.error);
      }

      const invite = await repos.userInvites.findById(result.value.inviteId);
      const user = invite ? await repos.users.findById(invite.user_id) : null;
      if (!user) {
        throw notFoundError("Invite target user was not found");
      }

      await sendInviteEmail({
        email: user.email,
        fullName: shortName(user),
        role: user.role,
        inviteUrl: getInviteUrl(result.value.token),
        expiresAt: result.value.expiresAt,
      });
      const deliveryResult = await provisioning.markInviteDelivered(
        result.value.inviteId,
      );
      if (isErr(deliveryResult)) {
        throwMarkInviteDeliveredError(deliveryResult.error);
      }
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
        throwRevokeInviteError(result.error);
      }
    },
  });
}
