"use server";

import { ROLES } from "~/lib/auth/access/rbac";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { asTeamId, asUserInviteId } from "~/server/shared/ids";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { isErr, Ok } from "~/server/shared/result";
import {
  createTeamInvite as createTeamInviteService,
  resendTeamInvite as resendTeamInviteService,
  revokeTeamInvite as revokeTeamInviteService,
} from "~/server/team/application/invites";
import { validateTeamInviteInput } from "~/server/team/domain/invite-input";

export async function createTeamInvite(
  input: unknown,
): Promise<{ inviteId: string; message: string }> {
  return runAction({
    name: "team.invite.create",
    access: { kind: "permission", permission: "hr:manage" },

    parse: () => {
      const command = parseObject(input, validationFail, (r) => {
        const teamId = r.optStr("teamId");

        return {
          names: r.str("names"),
          firstSurname: r.str("firstSurname"),
          secondSurname: r.str("secondSurname"),
          email: r.str("email"),
          role: r.enum("role", ROLES),
          executiveCategory: r.optStr("executiveCategory"),
          teamId: teamId ? asTeamId(teamId) : null,
          expiresAt: r.optNum("expiresAt"),
        };
      });

      if (isErr(command)) {
        return command;
      }

      return validateTeamInviteInput(command.value);
    },

    audit: ({ role, teamId }) => ({
      role,
      hasTeamId: teamId !== null,
    }),

    execute: async (ctx, command) => {
      const result = await createTeamInviteService(
        ctx,
        getServerRuntime().team.invites,
        command,
      );

      if (isErr(result)) {
        return result;
      }

      return Ok({ ...result.value, message: "Invitación enviada" });
    },
  });
}

export async function resendTeamInvite(
  rawInviteId: unknown,
): Promise<{ message: string }> {
  return runAction({
    name: "team.invite.resend",
    access: { kind: "permission", permission: "hr:manage" },

    parse: () =>
      parseObject({ inviteId: rawInviteId }, validationFail, (r) => ({
        inviteId: asUserInviteId(r.str("inviteId")),
      })),

    audit: (command) => ({ inviteId: command.inviteId }),

    execute: async (ctx, command) => {
      const result = await resendTeamInviteService(
        ctx,
        getServerRuntime().team.invites,
        command,
      );

      if (isErr(result)) {
        return result;
      }

      return Ok({ message: "Invitación reenviada" });
    },
  });
}

export async function revokeTeamInvite(
  rawInviteId: unknown,
): Promise<{ message: string }> {
  return runAction({
    name: "team.invite.revoke",
    access: { kind: "permission", permission: "hr:manage" },

    parse: () =>
      parseObject({ inviteId: rawInviteId }, validationFail, (r) => ({
        inviteId: asUserInviteId(r.str("inviteId")),
      })),

    audit: (command) => ({ inviteId: command.inviteId }),

    execute: async (ctx, command) => {
      const result = await revokeTeamInviteService(
        ctx,
        getServerRuntime().team.invites,
        command,
      );

      if (isErr(result)) {
        return result;
      }

      return Ok({ message: "Invitación revocada" });
    },
  });
}
