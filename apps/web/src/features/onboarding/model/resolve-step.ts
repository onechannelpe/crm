import type { OnboardingSnapshot } from "~/server/auth/onboarding/snapshot";

export type OnboardingStep =
  | "password"
  | "profile"
  | "security"
  | "passkey"
  | "totp";

export type RequestedSecurityStep = "passkey" | "totp" | null;

export function resolveOnboardingStep(
  snapshot: OnboardingSnapshot,
  requestedStep: RequestedSecurityStep,
): OnboardingStep {
  if (snapshot.passwordChangeRequired) return "password";
  if (!snapshot.user.phone) return "profile";
  if (requestedStep) return requestedStep;
  return "security";
}
