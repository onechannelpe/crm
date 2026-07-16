"use server";

import { changeInstallationPassword } from "~/server/auth/flows/change-installation-password";
import {
  loadOnboardingSnapshot,
  type OnboardingSnapshot,
} from "~/server/auth/onboarding/snapshot";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { validationFail } from "~/server/shared/parsing";
import { parseObject } from "~/server/shared/parsing";

export async function changeOnboardingPassword(input: {
  password: unknown;
  confirmPassword: unknown;
}): Promise<OnboardingSnapshot> {
  return runAction({
    name: "auth.onboarding.change_password",
    access: { kind: "session" },
    parse: () =>
      parseObject(input, validationFail, (reader) => ({
        password: reader.str("password"),
        confirmPassword: reader.str("confirmPassword"),
      })),
    execute: async (ctx, password) => {
      const setup = getServerRuntime().auth.setup;
      const changed = await changeInstallationPassword(setup, {
        userId: ctx.actor.userId,
        currentSessionId: ctx.actor.id,
        password: password.password,
        confirmPassword: password.confirmPassword,
        now: ctx.now(),
      });
      if (!changed.ok) return changed;
      return loadOnboardingSnapshot(setup.repos, ctx.actor.userId);
    },
  });
}
