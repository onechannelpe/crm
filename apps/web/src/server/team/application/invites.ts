import { getAssignableRoleOptions } from "~/lib/auth/access/role-display";
import { hashInviteToken } from "~/lib/auth/invite/tokens";
import { shortName } from "~/lib/users/display-name";
import type { AppContext } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import {
  validateTeamInviteInput,
  type TeamInviteShape,
} from "../domain/invite-input";
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
import type {
  BulkImportSetup,
  InviteInfo,
  InviteManagement,
} from "./contracts";
import type { InviteManagementQueryPort } from "./ports";

export async function getInviteInfo(input: {
  token: string;
  repos: TeamInviteRepos;
}): Promise<Result<InviteInfo | null, DomainError>> {
  const invite = await input.repos.userInvites.findPendingByTokenHash(
    hashInviteToken(input.token),
    Date.now(),
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
    pendingInvites: pendingInvites.value,
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
  rawInput: TeamInviteShape,
): Promise<Result<{ inviteId: number }, DomainError>> {
  const validated = validateTeamInviteInput(rawInput);
  if (isErr(validated)) return validated;
  const input = validated.value;

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

  await sendInviteEmail({
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
  input: { inviteId: number },
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
    return Err({
      kind: "not_found",
      code: "invite_target_missing",
      message: "Invite target user was not found",
    });
  }

  await sendInviteEmail({
    email: user.email,
    fullName: shortName(user),
    role: user.role,
    inviteUrl: buildInviteUrl(result.value.token),
    expiresAt: result.value.expiresAt,
  });

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
  input: { inviteId: number },
): Promise<Result<void, DomainError>> {
  return deps.inviteService.revokeInvite({
    actorUserId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    branchId: ctx.actor.branchId,
    inviteId: input.inviteId,
  });
}
