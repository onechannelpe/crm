import { ROLES } from "~/domain/auth/access/rbac";
import { fail } from "~/domain/errors";
import type { ExecutiveCategory } from "~/domain/identity/executive-category";
import { TeamId, UserId } from "~/domain/ids";
import { application } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { Err, isErr, Ok } from "~/shared/result";

const EXECUTIVE_CATEGORIES = [
  "elite",
  "corporativa",
] as const satisfies ReadonlyArray<ExecutiveCategory>;

export async function updateMemberProfile(
  input: unknown,
): Promise<{ message: string }> {
  "use server";

  return executeSessionServerFunction({
    name: "members.profile.update",
    access: { kind: "permission", permission: "team:manage" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        userId: r.id("userId", UserId),
        names: r.str("names"),
        firstSurname: r.str("firstSurname"),
        secondSurname: r.str("secondSurname"),
        teamId: r.optId("teamId", TeamId) ?? null,
        executiveCategory:
          r.optEnum("executiveCategory", EXECUTIVE_CATEGORIES) ?? null,
      })),

    telemetry: (command) => ({ userId: command.userId }),

    execute: async (ctx, command) => {
      const result = await application.users.members.updateProfile(
        ctx,
        command,
      );
      if (isErr(result)) return result;
      return Ok({ message: "Perfil actualizado" });
    },
  });
}

export async function changeMemberRole(
  input: unknown,
): Promise<{ message: string }> {
  "use server";

  return executeSessionServerFunction({
    name: "members.role.change",
    access: { kind: "permission", permission: "team:manage" },

    parse: () => {
      const command = parseObject(input, validationFail, (r) => ({
        userId: r.id("userId", UserId),
        role: r.enum("role", ROLES),
        executiveCategory:
          r.optEnum("executiveCategory", EXECUTIVE_CATEGORIES) ?? null,
      }));
      if (isErr(command)) return command;

      if (
        command.value.role === "executive" &&
        command.value.executiveCategory === null
      ) {
        return Err(fail("invalid_executive_category"));
      }
      return command;
    },

    telemetry: (command) => ({ userId: command.userId, role: command.role }),

    execute: async (ctx, command) => {
      const result = await application.users.members.changeRole(ctx, command);
      if (isErr(result)) return result;
      return Ok({ message: "Rol actualizado" });
    },
  });
}

export async function deactivateMember(
  rawUserId: unknown,
): Promise<{ message: string }> {
  "use server";

  return executeSessionServerFunction({
    name: "members.deactivate",
    access: { kind: "permission", permission: "team:manage" },
    parse: () =>
      parseObject({ userId: rawUserId }, validationFail, (r) => ({
        userId: r.id("userId", UserId),
      })),
    telemetry: (command) => ({ userId: command.userId }),
    execute: async (ctx, command) => {
      const result = await application.users.members.deactivate(ctx, command);
      if (isErr(result)) return result;
      return Ok({ message: "Usuario desactivado" });
    },
  });
}

export async function reactivateMember(
  rawUserId: unknown,
): Promise<{ message: string }> {
  "use server";

  return executeSessionServerFunction({
    name: "members.reactivate",
    access: { kind: "permission", permission: "team:manage" },
    parse: () =>
      parseObject({ userId: rawUserId }, validationFail, (r) => ({
        userId: r.id("userId", UserId),
      })),
    telemetry: (command) => ({ userId: command.userId }),
    execute: async (ctx, command) => {
      const result = await application.users.members.reactivate(ctx, command);
      if (isErr(result)) return result;
      return Ok({ message: "Usuario reactivado" });
    },
  });
}

export async function updateMemberExpiry(
  input: unknown,
): Promise<{ message: string }> {
  "use server";

  return executeSessionServerFunction({
    name: "members.expiry.update",
    access: { kind: "permission", permission: "team:manage" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        userId: r.id("userId", UserId),
        expiresOn: r.optCalendarDate("expiresOn"),
      })),

    telemetry: (command) => ({ userId: command.userId }),

    execute: async (ctx, command) => {
      const result = await application.users.members.updateExpiry(ctx, command);
      if (isErr(result)) return result;
      return Ok({ message: "Vencimiento actualizado" });
    },
  });
}

export async function deleteMember(
  rawUserId: unknown,
): Promise<{ message: string }> {
  "use server";

  return executeSessionServerFunction({
    name: "members.delete",
    access: { kind: "permission", permission: "team:manage" },
    parse: () =>
      parseObject({ userId: rawUserId }, validationFail, (r) => ({
        userId: r.id("userId", UserId),
      })),
    telemetry: (command) => ({ userId: command.userId }),
    execute: async (ctx, command) => {
      const result = await application.users.members.remove(ctx, command);
      if (isErr(result)) return result;
      return Ok({ message: "Usuario eliminado" });
    },
  });
}
