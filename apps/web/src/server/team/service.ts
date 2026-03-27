import type { Role } from "~/lib/auth/access/rbac";
import { getAssignableRoleOptions } from "~/lib/auth/access/role-display";
import { hashInviteToken } from "~/lib/auth/invite/tokens";
import { shortName } from "~/lib/users/display-name";
import type { AppContext } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import {
  createTeamProvisioning,
  enforceInviteCreateRateLimit,
  issuePreAuthTeamSession,
  teamRepos,
} from "./repos";
import type {
  AcceptTeamInviteCommand,
  BulkImportSetup,
  CreateTeamInviteCommand,
  InviteInfo,
  InviteManagement,
} from "./types";

type TeamProvisioning = ReturnType<typeof createTeamProvisioning>;

const teamProvisioning = createTeamProvisioning();

export async function getInviteInfo(input: {
  token: string;
}): Promise<Result<InviteInfo | null, DomainError>> {
  try {
    const invite = await teamRepos.userInvites.findPendingByTokenHash(
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
    teamRepos.teams.findByBranch(ctx.actor.branchId),
    teamProvisioning.listPendingInvites(ctx.actor.branchId),
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
  await enforceInviteCreateRateLimit(ctx.actor.userId);

  const result = await teamProvisioning.createInvite({
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

  const deliveryResult = await teamProvisioning.markInviteDelivered(
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
  const result = await teamProvisioning.resendInvite({
    actorUserId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    branchId: ctx.actor.branchId,
    inviteId: input.inviteId,
  });
  if (isErr(result)) {
    return result;
  }

  const invite = await teamRepos.userInvites.findById(result.value.inviteId);
  const user = invite ? await teamRepos.users.findById(invite.user_id) : null;
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

  const deliveryResult = await teamProvisioning.markInviteDelivered(
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
  return teamProvisioning.revokeInvite({
    actorUserId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    branchId: ctx.actor.branchId,
    inviteId: input.inviteId,
  });
}

export async function acceptTeamInvite(
  request: {
    ipAddress: string;
    userAgent: string | null;
  },
  input: AcceptTeamInviteCommand & { passwordHash: string },
): Promise<Result<{ sessionToken: string; redirectTo: string }, DomainError>> {
  const result = await teamProvisioning.acceptInvite({
    token: input.token,
    passwordHash: input.passwordHash,
  });
  if (isErr(result)) {
    return result;
  }

  const issued = await issuePreAuthTeamSession({
    user: {
      id: result.value.userId,
      branch_id: result.value.branchId,
      role: result.value.role,
      onboarding_completed_at: null,
    },
    request,
  });

  return Ok({
    sessionToken: issued.token,
    redirectTo: "/onboarding",
  });
}
