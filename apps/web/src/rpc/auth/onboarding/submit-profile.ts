import type { OnboardingSnapshot } from "~/contracts/auth";
import { fail, type DomainError } from "~/domain/errors";
import { parsePhone } from "~/domain/phone/pe-mobile";
import { executeSessionServerFunction } from "~/server/platform/action";
import { application } from "~/server/platform/composition/application";
import { Err, Ok, type Result } from "~/shared/result";

export async function submitOnboardingProfile(input: {
  phone: unknown;
}): Promise<OnboardingSnapshot> {
  "use server";

  return executeSessionServerFunction({
    name: "auth.onboarding.save_profile",
    access: { kind: "session" },
    parse: (): Result<
      NonNullable<ReturnType<typeof parsePhone>>,
      DomainError
    > => {
      const phone =
        typeof input.phone === "string" ? parsePhone(input.phone) : null;
      return phone ? Ok(phone) : Err(fail("invalid_phone"));
    },
    execute: (ctx, phone) =>
      application.auth.onboarding.saveProfile(ctx, phone),
  });
}
