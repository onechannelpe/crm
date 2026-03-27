"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import { runAction } from "~/server/shared/action-runtime";
import { repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";
import {
  createTeamInvite as createTeamInviteService,
  getInviteInfo as getInviteInfoService,
  resendTeamInvite as resendTeamInviteService,
  revokeTeamInvite as revokeTeamInviteService,
} from "~/server/team/service-invites";
import type { InviteInfo } from "~/server/team/types";

import { parseCreateTeamInviteInput, parseInviteIdInput } from "./input";
import { getInviteUrl, sendInviteEmail } from "./utils";

export async function getInviteInfo(token: string): Promise<InviteInfo | null> {
  const result = await getInviteInfoService({ token });
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
  const session = await requirePermission("hr:manage");
  await checkActionRateLimit("team.invite.create", session.userId, repos);

  return runAction({
    actionName: "team.invite.create",
    actor: session,
    input: {
      role: safeInput.role,
      hasTeamId: safeInput.teamId !== null,
    },
    execute: (ctx) =>
      createTeamInviteService(ctx, safeInput, {
        sendInviteEmail,
        getInviteUrl,
      }),
  });
}

export async function resendTeamInvite(inviteId: number): Promise<void> {
  const parsedInput = parseInviteIdInput(inviteId);
  if (isErr(parsedInput)) {
    throw parsedInput.error;
  }

  const session = await requirePermission("hr:manage");
  await runAction({
    actionName: "team.invite.resend",
    actor: session,
    input: { inviteId: parsedInput.value.inviteId },
    execute: (ctx) =>
      resendTeamInviteService(ctx, parsedInput.value, {
        sendInviteEmail,
        getInviteUrl,
      }),
  });
}

export async function revokeTeamInvite(inviteId: number): Promise<void> {
  const parsedInput = parseInviteIdInput(inviteId);
  if (isErr(parsedInput)) {
    throw parsedInput.error;
  }

  const session = await requirePermission("hr:manage");
  await runAction({
    actionName: "team.invite.revoke",
    actor: session,
    input: { inviteId: parsedInput.value.inviteId },
    execute: (ctx) => revokeTeamInviteService(ctx, parsedInput.value),
  });
}
