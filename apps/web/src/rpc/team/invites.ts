import { ROLES } from "~/domain/auth/access/rbac";
import { TeamId, UserInviteId } from "~/domain/ids";
import { application } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { getRequestOperation } from "~/server/platform/http/request-context-storage";
import {
  validateTeamInviteInput,
  validateTeamInviteShape,
} from "~/server/team/domain/invite-input";
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

      const shape = validateTeamInviteShape(command.value);
      if (isErr(shape)) {
        return shape;
      }

      return validateTeamInviteInput(command.value, getRequestOperation());
    },

    telemetry: ({ role, teamId }) => ({
      role,
      hasTeamId: teamId !== null,
    }),

    execute: async (ctx, command) => {
      const result = await application.team.invites.create(ctx, command);

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

    telemetry: (command) => ({ inviteId: command.inviteId }),

    execute: async (ctx, command) => {
      const result = await application.team.invites.resend(ctx, command);

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

    telemetry: (command) => ({ inviteId: command.inviteId }),

    execute: async (ctx, command) => {
      const result = await application.team.invites.revoke(ctx, command);

      if (isErr(result)) {
        return result;
      }

      return Ok({ message: "Invitación revocada" });
    },
  });
}
