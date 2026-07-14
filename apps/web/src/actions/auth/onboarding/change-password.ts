"use server";

import { changeInstallationPassword } from "~/server/auth/flows/change-installation-password";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { validationFail } from "~/server/shared/parsing";
import { parseObject } from "~/server/shared/parsing";

export async function changeOnboardingPassword(input: {
  password: unknown;
  confirmPassword: unknown;
}): Promise<void> {
  return runAction({
    name: "auth.onboarding.change_password",
    access: { kind: "session" },
    parse: () =>
      parseObject(input, validationFail, (reader) => ({
        password: reader.str("password"),
        confirmPassword: reader.str("confirmPassword"),
      })),
    execute: (ctx, password) =>
      changeInstallationPassword(getServerRuntime().auth.onboarding, {
        userId: ctx.actor.userId,
        currentSessionId: ctx.actor.id,
        password: password.password,
        confirmPassword: password.confirmPassword,
        now: ctx.now(),
      }),
  });
}
