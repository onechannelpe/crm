import { ROLES } from "~/domain/auth/access/rbac";
import { TeamId, UserInviteId } from "~/domain/ids";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import {
  createTeamInvite as createTeamInviteService,
  resendTeamInvite as resendTeamInviteService,
  revokeTeamInvite as revokeTeamInviteService,
} from "~/server/team/application/invites";
import { validateTeamInviteInput } from "~/server/team/domain/invite-input";
import { composeTeam } from "~/server/team/ui/composition";
import { isErr, Ok } from "~/shared/result";

export async function createTeamInvite(input: unknown): Promise<{
  inviteId: string;
  inviteUrl: string;
  delivered: boolean;
  message: string;
}> {
  "use server";

  return executeSessionServerFunction({
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
          teamId: teamId ? r.id("teamId", TeamId) : null,
          expiresOn: r.optCalendarDate("expiresOn"),
        };
      });

      if (isErr(command)) {
        return command;
      }

      return validateTeamInviteInput(command.value, new Date());
    },

    audit: ({ role, teamId }) => ({
      role,
      hasTeamId: teamId !== null,
    }),

    execute: async (ctx, command) => {
      const result = await createTeamInviteService(
        ctx,
        composeTeam().invites,
        command,
      );

      if (isErr(result)) {
        return result;
      }

      const message = result.value.delivered
        ? "Invitación enviada"
        : "Invitación creada. No se pudo enviar el correo; copia el enlace.";
      return Ok({ ...result.value, message });
    },
  });
}

export async function resendTeamInvite(
  rawInviteId: unknown,
): Promise<{ message: string }> {
  "use server";

  return executeSessionServerFunction({
    name: "team.invite.resend",
    access: { kind: "permission", permission: "hr:manage" },

    parse: () =>
      parseObject({ inviteId: rawInviteId }, validationFail, (r) => ({
        inviteId: r.id("inviteId", UserInviteId),
      })),

    audit: (command) => ({ inviteId: command.inviteId }),

    execute: async (ctx, command) => {
      const result = await resendTeamInviteService(
        ctx,
        composeTeam().invites,
        command,
      );

      if (isErr(result)) {
        return result;
      }

      const message = result.value.delivered
        ? "Invitación reenviada"
        : "Enlace renovado. No se pudo enviar el correo; copia el enlace.";
      return Ok({ message });
    },
  });
}

export async function revokeTeamInvite(
  rawInviteId: unknown,
): Promise<{ message: string }> {
  "use server";

  return executeSessionServerFunction({
    name: "team.invite.revoke",
    access: { kind: "permission", permission: "hr:manage" },

    parse: () =>
      parseObject({ inviteId: rawInviteId }, validationFail, (r) => ({
        inviteId: r.id("inviteId", UserInviteId),
      })),

    audit: (command) => ({ inviteId: command.inviteId }),

    execute: async (ctx, command) => {
      const result = await revokeTeamInviteService(
        ctx,
        composeTeam().invites,
        command,
      );

      if (isErr(result)) {
        return result;
      }

      return Ok({ message: "Invitación revocada" });
    },
  });
}
