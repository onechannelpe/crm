import type { AppContext } from "~/server/platform/action/context";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, isErr, type Result } from "~/server/shared/result";

import type { AuthSessionReadContext } from "../../infrastructure/session-context";
import { deriveOnboardingRequirements } from "../../policy/engine";
import type { OnboardingRequirements } from "../../policy/types";
import { getCurrentUser } from "./get-current-user";

export async function getOnboardingRequirements(
  ctx: AppContext,
  deps: AuthSessionReadContext,
): Promise<Result<OnboardingRequirements, DomainError>> {
  const currentUser = await getCurrentUser(ctx, deps);
  if (isErr(currentUser)) {
    return currentUser;
  }

  if (currentUser.value === null) {
    return Ok({
      sessionState: "onboarding_profile",
      requiredActions: ["set_profile"],
      optionalActions: [],
      canAccessApp: false,
      nextRoute: "/login",
      reasons: ["user_missing"],
    });
  }

  return Ok(deriveOnboardingRequirements(currentUser.value));
}
