import type { OnboardingSnapshot } from "~/contracts/auth";
import { deleteSessionCookie } from "~/server/auth/session/cookies";
import { application } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";

export async function changeOnboardingPassword(input: {
  password: unknown;
  confirmPassword: unknown;
}): Promise<OnboardingSnapshot> {
  "use server";

  const snapshot = await executeSessionServerFunction({
    name: "auth.onboarding.change_password",
    access: { kind: "session" },

    parse: () =>
      parseObject(input, validationFail, (reader) => ({
        password: reader.str("password"),
        confirmPassword: reader.str("confirmPassword"),
      })),

    execute: async (ctx, credentials) => {
      const changed = await application.auth.onboarding.changePassword(
        ctx,
        credentials,
      );

      if (!changed.ok) {
        return changed;
      }

      return application.auth.onboarding.snapshot(ctx.actor.userId);
    },
  });

  // Changing the password revokes the current session.
  deleteSessionCookie();

  return snapshot;
}
