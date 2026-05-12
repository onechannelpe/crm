import { isValidPeMobile, normalizePeMobileInput } from "~/lib/phone/pe-mobile";
import type { OnboardingRequirements } from "~/server/auth/policy/types";

import type { Facts } from "../model/state";

export function deriveFacts(input: {
  requirements: OnboardingRequirements;
  userPhone: string | null;
  phoneDraft: string | undefined;
}): Facts & { phoneDraft: string } {
  const phoneDraft = normalizePeMobileInput(input.phoneDraft);
  const hasValidDraft = isValidPeMobile(phoneDraft);
  const hasPhone = hasValidDraft || input.userPhone !== null;

  return {
    requirements: input.requirements,
    hasPhone,
    phoneDraft,
  };
}
