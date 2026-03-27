"use server";

import { throwDomainError } from "~/actions/throw-domain-error";
import { notFoundError } from "~/lib/app-errors";
import type { Role } from "~/lib/auth/access/rbac";
import { requirePermission } from "~/lib/auth/access/session";
import { hashInviteToken } from "~/lib/auth/invite/tokens";
import { runObservedAction } from "~/lib/observability/run-observed-action";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import { shortName } from "~/lib/users/display-name";
import { repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

import { parseCreateTeamInviteInput, parseInviteIdInput } from "./input";
import { provisioning } from "./provisioning";
import { getInviteUrl, sendInviteEmail } from "./utils";

export interface InviteInfo {
  fullName: string;
  username: string;
  email: string;
}

export async function getInviteInfo(token: string): Promise<InviteInfo | null> {
  const invite = await repos.userInvites.findPendingByTokenHash(
    hashInviteToken(token),
    Date.now(),
  );
  if (!invite) return null;
  return {
    fullName: `${invite.user_names} ${invite.user_first_surname} ${invite.user_second_surname}`,
    username: invite.user_username,
    email: invite.user_email,
  };
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
  const safeInput = parseCreateTeamInviteInput(input);

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
        throwDomainError(result.error);
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
        throwDomainError(deliveryResult.error);
      }

      return { inviteId: result.value.inviteId };
    },
  });
}

export async function resendTeamInvite(inviteId: number): Promise<void> {
  const parsedInput = parseInviteIdInput(inviteId);
  if (isErr(parsedInput)) {
    throwDomainError(parsedInput.error);
  }
  const actor = { userId: null as number | null, role: null as Role | null };
  await runObservedAction({
    actionName: "team.invite.resend",
    actor,
    input: { inviteId: parsedInput.value.inviteId },
    run: async () => {
      const session = await requirePermission("hr:manage");
      actor.userId = session.userId;
      actor.role = session.role;

      const result = await provisioning.resendInvite({
        actorUserId: session.userId,
        actorRole: session.role,
        branchId: session.branchId,
        inviteId: parsedInput.value.inviteId,
      });
      if (isErr(result)) {
        throwDomainError(result.error);
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
        throwDomainError(deliveryResult.error);
      }
    },
  });
}

export async function revokeTeamInvite(inviteId: number): Promise<void> {
  const parsedInput = parseInviteIdInput(inviteId);
  if (isErr(parsedInput)) {
    throwDomainError(parsedInput.error);
  }
  const actor = { userId: null as number | null, role: null as Role | null };
  await runObservedAction({
    actionName: "team.invite.revoke",
    actor,
    input: { inviteId: parsedInput.value.inviteId },
    run: async () => {
      const session = await requirePermission("hr:manage");
      actor.userId = session.userId;
      actor.role = session.role;
      const result = await provisioning.revokeInvite({
        actorUserId: session.userId,
        actorRole: session.role,
        branchId: session.branchId,
        inviteId: parsedInput.value.inviteId,
      });
      if (isErr(result)) {
        throwDomainError(result.error);
      }
    },
  });
}
