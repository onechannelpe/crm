"use server";

import type { OnboardingSnapshot } from "~/contracts/auth";
import { changeInstallationPassword } from "~/server/auth/flows/change-installation-password";
import { loadOnboardingSnapshot } from "~/server/auth/onboarding/snapshot";
import { runAction } from "~/server/platform/action";
import { validationFail } from "~/server/platform/action/input-reader";
import { parseObject } from "~/server/platform/action/input-reader";
import { getAuthRuntime } from "~/server/platform/container/auth-runtime";

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
      const setup = getAuthRuntime().setup;
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
