import type { BulkImportSetup, InviteManagement } from "~/contracts/team";
import { getAssignableRoleOptions } from "~/lib/auth/access/role-display";
import { hashInviteToken } from "~/lib/auth/invite/tokens";
import { shortName } from "~/lib/users/display-name";
import type { AppContext } from "~/server/platform/action/context";
import { fail, type DomainError } from "~/server/shared/domain-error";
import type { UserInviteId } from "~/server/shared/ids";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";
import { epochMilliseconds } from "~/server/shared/time";

import type {
  TeamInviteCreateContext,
  TeamInviteProvisioningContext,
  TeamInviteRepos,
  TeamInviteResendContext,
} from "../infrastructure/invite-context";
import {
  buildInviteUrl,
  sendInviteEmail,
} from "../infrastructure/invite-delivery";
import type { CreateTeamInviteCommand, InviteInfo } from "./contracts";
import type { InviteManagementQueryPort } from "./ports";

export async function getInviteInfo(input: {
  token: string;
  repos: TeamInviteRepos;
}): Promise<Result<InviteInfo | null, DomainError>> {
  const invite = await input.repos.userInvites.findPendingByTokenHash(
    hashInviteToken(input.token),
    new Date(),
  );
  if (!invite) {
    return Ok(null);
  }
  return Ok({
    fullName: `${invite.user_names} ${invite.user_first_surname} ${invite.user_second_surname}`,
    username: invite.user_username,
    email: invite.user_email,
  });
}

export async function getInviteManagement(
  ctx: AppContext,
  port: InviteManagementQueryPort,
): Promise<Result<InviteManagement, DomainError>> {
  const [teams, pendingInvites] = await Promise.all([
    port.listTeamsByBranch(ctx.actor.branchId),
    port.listPendingInvites(ctx.actor.branchId),
  ]);
  if (isErr(pendingInvites)) {
    return pendingInvites;
  }

  return Ok({
    pendingInvites: pendingInvites.value.map((invite) => ({
      inviteId: invite.inviteId,
      userId: invite.userId,
      names: invite.names,
      firstSurname: invite.firstSurname,
      secondSurname: invite.secondSurname,
      email: invite.email,
      role: invite.role,
      teamId: invite.teamId,
      expiresAt: epochMilliseconds(invite.expiresAt),
      createdAt: epochMilliseconds(invite.createdAt),
      sentAt: invite.sentAt ? epochMilliseconds(invite.sentAt) : null,
    })),
    teams,
    assignableRoles: getAssignableRoleOptions(ctx.actor.role),
  });
}

export async function getBulkImportSetup(
  ctx: AppContext,
): Promise<Result<BulkImportSetup, DomainError>> {
  return Ok({
    assignableRoles: getAssignableRoleOptions(ctx.actor.role),
  });
}

export async function createTeamInvite(
  ctx: AppContext,
  deps: TeamInviteCreateContext,
  input: CreateTeamInviteCommand,
): Promise<Result<{ inviteId: string }, DomainError>> {
  await deps.enforceInviteCreateRateLimit(ctx.actor.userId);

  const result = await deps.inviteService.createInvite({
    actorUserId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    branchId: ctx.actor.branchId,
    names: input.names,
    firstSurname: input.firstSurname,
    secondSurname: input.secondSurname,
    email: input.email,
    role: input.role,
    executiveCategory: input.executiveCategory,
    teamId: input.teamId,
    expiresAt: input.expiresAt,
  });
  if (isErr(result)) {
    return result;
  }

  const emailResult = await sendInviteEmail({
    email: input.email,
    fullName: shortName({
      names: input.names,
      firstSurname: input.firstSurname,
      secondSurname: input.secondSurname,
    }),
    role: input.role,
    inviteUrl: buildInviteUrl(result.value.token),
    expiresAt: result.value.expiresAt,
  });
  if (isErr(emailResult)) {
    return emailResult;
  }

  const deliveryResult = await deps.inviteService.markInviteDelivered(
    result.value.inviteId,
  );
  if (isErr(deliveryResult)) {
    return deliveryResult;
  }

  return Ok({ inviteId: result.value.inviteId });
}

export async function resendTeamInvite(
  ctx: AppContext,
  deps: TeamInviteResendContext,
  input: { inviteId: UserInviteId },
): Promise<Result<void, DomainError>> {
  const result = await deps.inviteService.resendInvite({
    actorUserId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    branchId: ctx.actor.branchId,
    inviteId: input.inviteId,
  });
  if (isErr(result)) {
    return result;
  }

  const invite = await deps.repos.userInvites.findById(result.value.inviteId);
  const user = invite ? await deps.repos.users.findById(invite.user_id) : null;
  if (!user) {
    return Err(fail("invite_target_missing"));
  }

  const emailResult = await sendInviteEmail({
    email: user.email,
    fullName: shortName(user),
    role: user.role,
    inviteUrl: buildInviteUrl(result.value.token),
    expiresAt: result.value.expiresAt,
  });
  if (isErr(emailResult)) {
    return emailResult;
  }

  const deliveryResult = await deps.inviteService.markInviteDelivered(
    result.value.inviteId,
  );
  if (isErr(deliveryResult)) {
    return deliveryResult;
  }

  return Ok(undefined);
}

export async function revokeTeamInvite(
  ctx: AppContext,
  deps: TeamInviteProvisioningContext,
  input: { inviteId: UserInviteId },
): Promise<Result<void, DomainError>> {
  return deps.inviteService.revokeInvite({
    actorUserId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    branchId: ctx.actor.branchId,
    inviteId: input.inviteId,
  });
}
