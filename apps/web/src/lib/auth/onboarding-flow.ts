import type { CurrentUser } from "~/actions/auth/session";

export type OnboardingStep = "profile" | "security";

export interface OnboardingState {
  currentStep: OnboardingStep;
  profileReady: boolean;
  securityReady: boolean;
  canFinish: boolean;
}

const LOCAL_PHONE = /^\d{9}$/;
const E164_PE = /^\+51\d{9}$/;

export function isValidOnboardingPhone(value: string): boolean {
  const v = value.replace(/\s+/g, "").trim();
  return LOCAL_PHONE.test(v) || E164_PE.test(v);
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
