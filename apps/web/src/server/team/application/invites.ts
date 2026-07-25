import type { BulkImportSetup, InviteManagement } from "~/contracts/team";
import type { Role } from "~/domain/auth/access/rbac";
import { getAssignableRoleOptions } from "~/domain/auth/access/role-display";
import { fail, type DomainError } from "~/domain/errors";
import { shortName } from "~/domain/identity/display-name";
import type { UserInviteId } from "~/domain/ids";
import { epochMilliseconds } from "~/domain/time/epoch";
import type { InviteService } from "~/server/invites/application/types";
import { inviteLink } from "~/server/invites/domain/invite-link";
import type { AppContext } from "~/server/platform/action/context";
import { createLogger } from "~/shared/observability/runtime-logger";
import { Err, isErr, Ok, type Result } from "~/shared/result";

import type {
  TeamInviteCreateContext,
  TeamInviteProvisioningContext,
  TeamInviteRepos,
  TeamInviteResendContext,
} from "../infrastructure/invite-context";
import type { CreateTeamInviteCommand, InviteInfo } from "./contracts";
import type { InviteManagementQueryPort } from "./ports";

const logger = createLogger("team.invites");

export interface CreateTeamInviteResult {
  inviteId: string;
  email: string;
  inviteUrl: string;
  delivered: boolean;
}

async function deliverInviteEmail(
  delivery: TeamInviteCreateContext["delivery"],
  inviteService: Pick<InviteService, "markInviteDelivered">,
  params: {
    inviteId: UserInviteId;
    email: string;
    fullName: string;
    role: Role;
    inviteUrl: string;
    expiresAt: Date;
  },
): Promise<boolean> {
  const sent = await delivery.send({
    email: params.email,
    fullName: params.fullName,
    role: params.role,
    inviteUrl: params.inviteUrl,
    expiresAt: params.expiresAt,
  });

  if (isErr(sent)) {
    logger.error("invite.email_delivery_failed", {
      inviteId: params.inviteId,
      code: sent.error.code,
    });

    return false;
  }

  const marked = await inviteService.markInviteDelivered(params.inviteId);

  if (isErr(marked)) {
    logger.error("invite.mark_delivered_failed", {
      inviteId: params.inviteId,
    });

    return false;
  }

  return true;
}

export async function getInviteInfo(input: {
  token: string;
  repos: TeamInviteRepos;
}): Promise<Result<InviteInfo | null, DomainError>> {
  const invite = await input.repos.userInvites.findPendingByToken(
    input.token,
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
  publicOrigin: string,
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
      inviteUrl: inviteLink(publicOrigin, invite.token),
      expiresAt: epochMilliseconds(invite.expiresAt),
      createdAt: epochMilliseconds(invite.createdAt),
      lastDeliveredAt: invite.lastDeliveredAt
        ? epochMilliseconds(invite.lastDeliveredAt)
        : null,
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
): Promise<Result<CreateTeamInviteResult, DomainError>> {
  await deps.enforceInviteCreateRateLimit(ctx.actor.userId);

  const created = await deps.inviteService.createInvite({
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

  if (isErr(created)) {
    return created;
  }

  const inviteUrl = inviteLink(deps.publicOrigin, created.value.token);

  const delivered = await deliverInviteEmail(
    deps.delivery,
    deps.inviteService,
    {
      inviteId: created.value.inviteId,
      email: input.email,
      fullName: shortName({
        names: input.names,
        firstSurname: input.firstSurname,
        secondSurname: input.secondSurname,
      }),
      role: input.role,
      inviteUrl,
      expiresAt: created.value.expiresAt,
    },
  );

  return Ok({
    inviteId: created.value.inviteId,
    email: input.email,
    inviteUrl,
    delivered,
  });
}

export async function resendTeamInvite(
  ctx: AppContext,
  deps: TeamInviteResendContext,
  input: { inviteId: UserInviteId },
): Promise<Result<{ delivered: boolean }, DomainError>> {
  const redelivered = await deps.inviteService.redeliverInvite({
    actorUserId: ctx.actor.userId,
    actorRole: ctx.actor.role,
    branchId: ctx.actor.branchId,
    inviteId: input.inviteId,
  });

  if (isErr(redelivered)) {
    return redelivered;
  }

  const invite = await deps.repos.userInvites.findById(
    redelivered.value.inviteId,
  );

  const user = invite ? await deps.repos.users.findById(invite.user_id) : null;

  if (!user) {
    return Err(fail("invite_target_missing"));
  }

  const delivered = await deliverInviteEmail(
    deps.delivery,
    deps.inviteService,
    {
      inviteId: redelivered.value.inviteId,
      email: user.email,
      fullName: shortName(user),
      role: user.role,
      inviteUrl: inviteLink(deps.publicOrigin, redelivered.value.token),
      expiresAt: redelivered.value.expiresAt,
    },
  );

  return Ok({ delivered });
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
