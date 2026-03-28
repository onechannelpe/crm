"use server";

import { runAction } from "~/server/shared/action-runtime";
import { isErr } from "~/server/shared/result";
import {
  createTeamInvite as createTeamInviteService,
  getInviteInfo as getInviteInfoService,
  resendTeamInvite as resendTeamInviteService,
  revokeTeamInvite as revokeTeamInviteService,
} from "~/server/team/application/invites";
import type { InviteInfo } from "~/server/team/domain/types";
import { createTeamDeps } from "~/server/team/infrastructure/deps";

import { parseCreateTeamInviteInput, parseInviteIdInput } from "./input";

export async function getInviteInfo(token: string): Promise<InviteInfo | null> {
  const result = await getInviteInfoService({
    token,
    deps: createTeamDeps(),
  });
  if (isErr(result)) {
    throw result.error;
  }
  return result.value;
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

  return runAction({
    actionName: "team.invite.create",
    permission: "hr:manage",
    input: {
      role: safeInput.role,
      hasTeamId: safeInput.teamId !== null,
    },
    execute: (ctx) => createTeamInviteService(ctx, createTeamDeps(), safeInput),
  });
}

export async function resendTeamInvite(inviteId: number): Promise<void> {
  const parsedInput = parseInviteIdInput(inviteId);
  if (isErr(parsedInput)) {
    throw parsedInput.error;
  }

  await runAction({
    actionName: "team.invite.resend",
    permission: "hr:manage",
    input: { inviteId: parsedInput.value.inviteId },
    execute: (ctx) =>
      resendTeamInviteService(ctx, createTeamDeps(), parsedInput.value),
  });
}

export async function revokeTeamInvite(inviteId: number): Promise<void> {
  const parsedInput = parseInviteIdInput(inviteId);
  if (isErr(parsedInput)) {
    throw parsedInput.error;
  }

  await runAction({
    actionName: "team.invite.revoke",
    permission: "hr:manage",
    input: { inviteId: parsedInput.value.inviteId },
    execute: (ctx) =>
      revokeTeamInviteService(ctx, createTeamDeps(), parsedInput.value),
  });
}
