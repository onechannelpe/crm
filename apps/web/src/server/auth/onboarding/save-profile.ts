import type { OnboardingSnapshot } from "~/contracts/auth";
import { fail, type DomainError } from "~/domain/errors";
import type { UserId } from "~/domain/ids";
import type { Phone } from "~/domain/phone/pe-mobile";
import type { AuthSetupContext } from "~/server/auth/infrastructure/setup-context";
import type { OperationContext } from "~/server/platform/operation/context";
import { Err, type Result } from "~/shared/result";

import { loadOnboardingSnapshot } from "./snapshot";

export function saveOnboardingProfile(
  deps: AuthSetupContext,
  input: {
    userId: UserId;
    phone: Phone;
  },
  operation: OperationContext,
): Promise<Result<OnboardingSnapshot, DomainError>> {
  return deps.uow.run(async (repos) => {
    const user = await repos.users.findByIdForUpdate(input.userId);

    if (!user) {
      return Err(fail("user_not_found"));
    }

    if (user.onboarding_completed_at) {
      return Err(fail("invalid_input"));
    }

    const claim = await repos.userChannelAddresses.claimWhatsAppAddress({
      userId: input.userId,
      address: input.phone,
      claimedAt: operation.operationAt,
    });

    if (claim.kind === "already_claimed") {
      return Err(fail("phone_in_use"));
    }

    return loadOnboardingSnapshot(repos, input.userId);
  });
}
