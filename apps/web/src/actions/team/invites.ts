"use server";

import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import {
  createTeamInvite as createTeamInviteService,
  resendTeamInvite as resendTeamInviteService,
  revokeTeamInvite as revokeTeamInviteService,
} from "~/server/team/application/invites";

import { parseCreateTeamInviteInput, parseInviteIdInput } from "./input";

export async function createTeamInvite(input: {
  names: string;
  firstSurname: string;
  secondSurname: string;
  email: string;
  role: string;
  executiveCategory?: string | null;
  teamId?: number | null;
  expiresAt?: number | null;
}): Promise<{ inviteId: number }> {
  return runAction({
    actionName: "team.invite.create",
    access: { kind: "permission", permission: "hr:manage" },
    parse: () => parseCreateTeamInviteInput(input),
    audit: ({ role, teamId }) => ({ role, hasTeamId: teamId !== null }),
    execute: (ctx, safeInput) =>
      createTeamInviteService(ctx, getServerRuntime().team.invites, safeInput),
  });
}

export async function resendTeamInvite(inviteId: number): Promise<void> {
  await runAction({
    actionName: "team.invite.resend",
    access: { kind: "permission", permission: "hr:manage" },
    parse: () => parseInviteIdInput(inviteId),
    audit: ({ inviteId }) => ({ inviteId }),
    execute: (ctx, invite) =>
      resendTeamInviteService(ctx, getServerRuntime().team.invites, invite),
  });
}

export async function revokeTeamInvite(inviteId: number): Promise<void> {
  await runAction({
    actionName: "team.invite.revoke",
    access: { kind: "permission", permission: "hr:manage" },
    parse: () => parseInviteIdInput(inviteId),
    audit: ({ inviteId }) => ({ inviteId }),
    execute: (ctx, invite) =>
      revokeTeamInviteService(ctx, getServerRuntime().team.invites, invite),
  });
}
