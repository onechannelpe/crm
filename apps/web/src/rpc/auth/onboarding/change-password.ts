import type { OnboardingSnapshot } from "~/contracts/auth";
import { executeSessionServerFunction } from "~/server/platform/action";
import { validationFail } from "~/server/platform/action/input-reader";
import { parseObject } from "~/server/platform/action/input-reader";
import { application } from "~/server/platform/composition/application";

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
      const changed = await application.auth.onboarding.changePassword(
        ctx,
        password,
      );
      if (!changed.ok) return changed;
      return application.auth.onboarding.snapshot(ctx.actor.userId);
    },
  });
}
