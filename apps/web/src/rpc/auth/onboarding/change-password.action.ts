import type { OnboardingSnapshot } from "~/contracts/auth";
import { changeInstallationPassword } from "~/server/auth/flows/change-installation-password";
import { loadOnboardingSnapshot } from "~/server/auth/onboarding/snapshot";
import { composeAuth } from "~/server/auth/ui/composition";
import { executeSessionServerFunction } from "~/server/platform/action";
import { validationFail } from "~/server/platform/action/input-reader";
import { parseObject } from "~/server/platform/action/input-reader";

export async function changeOnboardingPassword(input: {
  password: unknown;
  confirmPassword: unknown;
}): Promise<OnboardingSnapshot> {
  "use server";

  return executeSessionServerFunction({
    name: "auth.onboarding.change_password",
    access: { kind: "session" },
    parse: () =>
      parseObject(input, validationFail, (reader) => ({
        password: reader.str("password"),
        confirmPassword: reader.str("confirmPassword"),
      })),
    execute: async (ctx, password) => {
      const setup = composeAuth().setup;
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
