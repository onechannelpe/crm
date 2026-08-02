import { application } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";

export async function changePassword(
  currentPassword: unknown,
  newPassword: unknown,
): Promise<{ message: string }> {
  "use server";

  return executeSessionServerFunction({
    name: "settings.security.change_password",
    access: { kind: "auth" },

    parse: () =>
      parseObject({ currentPassword, newPassword }, validationFail, (r) => ({
        currentPassword: r.str("currentPassword"),
        newPassword: r.str("newPassword"),
      })),

    execute: (ctx, input) =>
      application.auth.security.changePassword(
        ctx.actor.userId,
        input.currentPassword,
        input.newPassword,
        ctx.operationAt,
      ),
  });
}

export async function removeAllPasskeys(): Promise<{ message: string }> {
  "use server";

  return executeSessionServerFunction({
    name: "settings.security.remove_passkeys",
    access: { kind: "session" },

    execute: (ctx) =>
      application.auth.security.removePasskeys(
        ctx.actor.userId,
        ctx.operationAt,
      ),
  });
}

export async function disableTotp(): Promise<{ message: string }> {
  "use server";

  return executeSessionServerFunction({
    name: "settings.security.disable_totp",
    access: { kind: "session" },

    execute: (ctx) =>
      application.auth.security.disableTotp(ctx.actor.userId, ctx.operationAt),
  });
}
