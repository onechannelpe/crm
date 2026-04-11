import type { AuthSessionState } from "../policy/types";
import type { OnboardingStateInput } from "./types";

export function resolveOnboardingSessionState(
  input: OnboardingStateInput,
): AuthSessionState {
  if (input.onboardingCompleted) {
    return "app_ready";
  }

  if (!input.hasPhone) {
    return "onboarding_profile";
  }

  if (input.requiresStrongAuth && !input.strongAuthConfigured) {
    return "onboarding_security_required";
  }

  return "pre_auth";
}
