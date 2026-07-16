import type { Phone } from "~/lib/phone/pe-mobile";
import type { AuthSetupContext } from "~/server/auth/infrastructure/setup-context";
import { fail, type DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import { Err, type Result } from "~/server/shared/result";

import { loadOnboardingSnapshot, type OnboardingSnapshot } from "./snapshot";

export function saveOnboardingProfile(
  deps: AuthSetupContext,
  input: { userId: UserId; phone: Phone; now: Date },
): Promise<Result<OnboardingSnapshot, DomainError>> {
  return deps.uow.run(async (repos) => {
    const user = await repos.users.findByIdForUpdate(input.userId);
    if (!user) return Err(fail("user_not_found"));
    if (user.onboarding_completed_at) return Err(fail("invalid_input"));

    const claimed = await repos.userChannelAddresses.claimWhatsAppAddress({
      userId: input.userId,
      address: input.phone,
      now: input.now,
    });
    if (claimed.kind === "already_claimed") {
      return Err(fail("phone_in_use"));
    }

    return loadOnboardingSnapshot(repos, input.userId);
  });
}
