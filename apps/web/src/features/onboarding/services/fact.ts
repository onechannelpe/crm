import type { OnboardingRequirements } from "~/server/auth/policy/types";

import { isValidOnboardingPhone } from "../model/onboarding-phone";
import type { Facts } from "../model/state";

function normalizeLocalPhone(phoneDraft: string | undefined): string {
  if (!phoneDraft) return "";
  const digits = phoneDraft.replace(/\D+/g, "");
  if (digits.startsWith("51") && digits.length === 11) {
    return digits.slice(2);
  }
  return digits.slice(0, 9);
}

export function deriveFacts(input: {
  requirements: OnboardingRequirements;
  userPhoneE164: string | null;
  phoneDraft: string | undefined;
}): Facts & { phoneDraft: string } {
  const phoneDraft = normalizeLocalPhone(input.phoneDraft);
  const hasValidDraft = isValidOnboardingPhone(phoneDraft);
  const hasPhone = hasValidDraft || input.userPhoneE164 !== null;

  return {
    requirements: input.requirements,
    hasPhone,
    phoneDraft,
  };
}
