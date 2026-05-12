import {
  isValidPeMobileLocal,
  normalizePeMobileLocalInput,
} from "~/lib/phone/pe-mobile";
import type { OnboardingRequirements } from "~/server/auth/policy/types";

import type { Facts } from "../model/state";

export function deriveFacts(input: {
  requirements: OnboardingRequirements;
  userPhoneE164: string | null;
  phoneDraft: string | undefined;
}): Facts & { phoneDraft: string } {
  const phoneDraft = normalizePeMobileLocalInput(input.phoneDraft);
  const hasValidDraft = isValidPeMobileLocal(phoneDraft);
  const hasPhone = hasValidDraft || input.userPhoneE164 !== null;

  return {
    requirements: input.requirements,
    hasPhone,
    phoneDraft,
  };
}
