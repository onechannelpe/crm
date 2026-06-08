"use server";

import { ROLES } from "~/lib/auth/access/rbac";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import { parseObject, validationFail } from "~/server/shared/parsing";
import type { Result } from "~/server/shared/result";
import {
  createTeamInvite as createTeamInviteService,
  resendTeamInvite as resendTeamInviteService,
  revokeTeamInvite as revokeTeamInviteService,
} from "~/server/team/application/invites";
import type { TeamInviteShape } from "~/server/team/domain/invite-input";

function parseInviteId(
  inviteId: unknown,
): Result<{ inviteId: number }, DomainError> {
  return parseObject({ inviteId }, validationFail, (r) => ({
    inviteId: r.num("inviteId"),
  }));
}

export async function createTeamInvite(
  input: unknown,
): Promise<{ inviteId: number }> {
  return runAction({
    actionName: "team.invite.create",
    access: { kind: "permission", permission: "hr:manage" },
    parse: (): Result<TeamInviteShape, DomainError> =>
      parseObject(input, validationFail, (r) => ({
        names: r.str("names"),
        firstSurname: r.str("firstSurname"),
        secondSurname: r.str("secondSurname"),
        email: r.str("email"),
        role: r.enum("role", ROLES),
        executiveCategory: r.optStr("executiveCategory"),
        teamId: r.optNum("teamId"),
        expiresAt: r.optNum("expiresAt"),
      })),
    audit: ({ role, teamId }) => ({ role, hasTeamId: teamId !== null }),
    execute: (ctx, shape) =>
      createTeamInviteService(ctx, getServerRuntime().team.invites, shape),
  });
}

export async function resendTeamInvite(inviteId: unknown): Promise<void> {
  await runAction({
    actionName: "team.invite.resend",
    access: { kind: "permission", permission: "hr:manage" },
    parse: () => parseInviteId(inviteId),
    audit: ({ inviteId }) => ({ inviteId }),
    execute: (ctx, invite) =>
      resendTeamInviteService(ctx, getServerRuntime().team.invites, invite),
  });
}

export async function revokeTeamInvite(inviteId: unknown): Promise<void> {
  await runAction({
    actionName: "team.invite.revoke",
    access: { kind: "permission", permission: "hr:manage" },
    parse: () => parseInviteId(inviteId),
    audit: ({ inviteId }) => ({ inviteId }),
    execute: (ctx, invite) =>
      revokeTeamInviteService(ctx, getServerRuntime().team.invites, invite),
  });
}
