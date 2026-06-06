import type { OnboardingRequirements } from "~/server/auth/policy/types";

import type { Facts } from "../model/state";

export function deriveFacts(input: {
  requirements: OnboardingRequirements;
  userPhone: string | null;
}): Facts {
  return {
    requirements: input.requirements,
    hasPhone: input.userPhone !== null,
  };
}
