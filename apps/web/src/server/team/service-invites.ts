import { getAssignableRoleOptions } from "~/lib/auth/access/role-display";
import type { Role } from "~/lib/auth/access/rbac";
import { hashInviteToken } from "~/lib/auth/invite/tokens";
import { shortName } from "~/lib/users/display-name";
import { repos, runInRepositoryTransaction } from "~/server/shared/context";
import type { DomainError } from "~/server/shared/domain-error";
import type { AppContext } from "~/server/shared/action-runtime";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";
import { createUserProvisioningService } from "~/server/users/service-user-provisioning";

import type {
  BulkImportSetup,
  CreateTeamInviteCommand,
  InviteInfo,
  InviteManagement,
} from "./types";

const provisioning = createUserProvisioningService(repos, {
  runInTransaction: runInRepositoryTransaction,
});

export async function getInviteInfo(input: {
  token: string;
}): Promise<Result<InviteInfo | null, DomainError>> {
  try {
    const invite = await repos.userInvites.findPendingByTokenHash(
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
  } catch (error) {
    return Err({
      kind: "unexpected",
      code: "unexpected",
      message: error instanceof Error ? error.message : "Invite read failed",
    });
  }
}

export async function getInviteManagement(
  ctx: AppContext,
): Promise<Result<InviteManagement, DomainError>> {
  const [teams, pendingInvites] = await Promise.all([
    repos.teams.findByBranch(ctx.actor.branchId),
    provisioning.listPendingInvites(ctx.actor.branchId),
  ]);
  if (isErr(pendingInvites)) {
    return pendingInvites;
  }

  return Ok({
    pendingInvites: pendingInvites.value,
    teams: teams.map((team) => ({ id: team.id, name: team.name })),
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
  input: CreateTeamInviteCommand,
  deps: {
    sendInviteEmail: (input: {
      email: string;
      fullName: string;
      role: Role;
      inviteUrl: string;
      expiresAt: number;
    }) => Promise<void>;
    getInviteUrl: (token: string) => string;
  },
): Promise<Result<{ inviteId: number }, DomainError>> {
  const result = await provisioning.createInvite({
    actorUserId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    branchId: ctx.actor.branchId,
    names: input.names,
    firstSurname: input.firstSurname,
    secondSurname: input.secondSurname,
    email: input.email,
    role: input.role,
    teamId: input.teamId,
    expiresAt: input.expiresAt,
  });
  if (isErr(result)) {
    return result;
  }

  await deps.sendInviteEmail({
    email: input.email,
    fullName: shortName({
      names: input.names,
      firstSurname: input.firstSurname,
      secondSurname: input.secondSurname,
    }),
    role: input.role,
    inviteUrl: deps.getInviteUrl(result.value.token),
    expiresAt: result.value.expiresAt,
  });

  const deliveryResult = await provisioning.markInviteDelivered(
    result.value.inviteId,
  );
  if (isErr(deliveryResult)) {
    return deliveryResult;
  }

  return Ok({ inviteId: result.value.inviteId });
}
export async function resendTeamInvite(
  ctx: AppContext,
  input: { inviteId: number },
  deps: {
    sendInviteEmail: (input: {
      email: string;
      fullName: string;
      role: Role;
      inviteUrl: string;
      expiresAt: number;
    }) => Promise<void>;
    getInviteUrl: (token: string) => string;
  },
): Promise<Result<void, DomainError>> {
  const result = await provisioning.resendInvite({
    actorUserId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    branchId: ctx.actor.branchId,
    inviteId: input.inviteId,
  });
  if (isErr(result)) {
    return result;
  }

  const invite = await repos.userInvites.findById(result.value.inviteId);
  const user = invite ? await repos.users.findById(invite.user_id) : null;
  if (!user) {
    return Err({
      kind: "not_found",
      code: "invite_target_missing",
      message: "Invite target user was not found",
    });
  }

  await deps.sendInviteEmail({
    email: user.email,
    fullName: shortName(user),
    role: user.role,
    inviteUrl: deps.getInviteUrl(result.value.token),
    expiresAt: result.value.expiresAt,
  });

  const deliveryResult = await provisioning.markInviteDelivered(
    result.value.inviteId,
  );
  if (isErr(deliveryResult)) {
    return deliveryResult;
  }

  return Ok(undefined);
}

export async function revokeTeamInvite(
  ctx: AppContext,
  input: { inviteId: number },
): Promise<Result<void, DomainError>> {
  return provisioning.revokeInvite({
    actorUserId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    branchId: ctx.actor.branchId,
    inviteId: input.inviteId,
  });
}
