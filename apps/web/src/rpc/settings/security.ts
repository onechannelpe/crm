import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { application } from "~/server/platform/composition/application";

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

    execute: ({ actor, operationAt }, input) =>
      application.auth.security.changePassword(
        actor.userId,
        input.currentPassword,
        input.newPassword,
        operationAt,
      ),
  });
}

export async function removeAllPasskeys(): Promise<{ message: string }> {
  "use server";

  return executeSessionServerFunction({
    name: "settings.security.remove_passkeys",
    access: { kind: "session" },

    execute: ({ actor, operationAt }) =>
      application.auth.security.removePasskeys(actor.userId, operationAt),
  });
}

export async function disableTotp(): Promise<{ message: string }> {
  "use server";

  return executeSessionServerFunction({
    name: "settings.security.disable_totp",
    access: { kind: "session" },

    execute: ({ actor, operationAt }) =>
      application.auth.security.disableTotp(actor.userId, operationAt),
  });
}
