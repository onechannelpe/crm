import type { CurrentUser } from "~/actions/auth";

export type OnboardingStep = "profile" | "security";

export interface OnboardingState {
  currentStep: OnboardingStep;
  profileReady: boolean;
  securityReady: boolean;
  canFinish: boolean;
}

const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

export function isValidOnboardingPhone(value: string): boolean {
  return E164_PATTERN.test(value.replace(/\s+/g, "").trim());
}

export function deriveOnboardingState(input: {
  requestedStep: OnboardingStep;
  phoneE164: string;
  user: Pick<CurrentUser, "strongAuthRequired" | "strongAuthConfigured">;
}): OnboardingState {
  const profileReady = isValidOnboardingPhone(input.phoneE164);
  const securityReady =
    !input.user.strongAuthRequired || input.user.strongAuthConfigured;

  return {
    currentStep:
      input.requestedStep === "security" && !profileReady
        ? "profile"
        : input.requestedStep,
    profileReady,
    securityReady,
    canFinish: profileReady && securityReady,
  };
}
