import type { Role } from "~/lib/auth/access/rbac";
import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import { isValidOnboardingPhone } from "~/features/onboarding/model/onboarding-phone";
import type { CurrentUserView } from "~/server/auth/application/contracts";

import { resolveOnboardingSessionState } from "../state/transitions";
import { requiresStrongAuthRole } from "./rules/role";
import type { AuthProof, LoginDecision, OnboardingRequirements } from "./types";

export interface LoginPolicyInput {
  proof: AuthProof;
  context: {
    user: {
      role: Role;
      onboarding_completed_at: number | null;
    };
    strongAuthStatus: {
      hasTotp: boolean;
      hasPasskey: boolean;
      hasVerifiedStrongAuth: boolean;
    };
  };
  now?: () => number;
}

export function evaluateLoginPolicy(input: LoginPolicyInput): LoginDecision {
  const now = input.now ?? Date.now;
  const { proof, context } = input;
  const onboardingCompleted = context.user.onboarding_completed_at !== null;

  if (proof.kind === "passkey") {
    return {
      kind: "issue_session",
      sessionClass: onboardingCompleted ? "app" : "pre_auth",
      strongAuthMethod: "passkey",
      strongAuthAt: now(),
    };
  }

  if (proof.kind === "google" && proof.trustedFederatedMfa) {
    return {
      kind: "issue_session",
      sessionClass: onboardingCompleted ? "app" : "pre_auth",
      strongAuthMethod: "federated",
      strongAuthAt: now(),
    };
  }

  if (!requiresStrongAuthRole(context.user.role)) {
    return {
      kind: "issue_session",
      sessionClass: onboardingCompleted ? "app" : "pre_auth",
      strongAuthMethod: null,
      strongAuthAt: null,
    };
  }

  if (!context.strongAuthStatus.hasVerifiedStrongAuth) {
    return onboardingCompleted
      ? {
          kind: "deny",
          reason: "strong_auth_required",
        }
      : {
          kind: "issue_session",
          sessionClass: "pre_auth",
          strongAuthMethod: null,
          strongAuthAt: null,
        };
  }

  if (!onboardingCompleted) {
    return {
      kind: "issue_session",
      sessionClass: "pre_auth",
      strongAuthMethod: null,
      strongAuthAt: null,
    };
  }

  if (context.strongAuthStatus.hasTotp) {
    return { kind: "require_totp" };
  }

  if (context.strongAuthStatus.hasPasskey) {
    return { kind: "require_passkey" };
  }

  return {
    kind: "deny",
    reason: "strong_auth_required",
  };
}

export function deriveOnboardingRequirements(
  user: Pick<
    CurrentUserView,
    "phoneE164" | "strongAuthConfigured" | "onboardingCompletedAt" | "role"
  >,
): OnboardingRequirements {
  const hasPhone =
    user.phoneE164 !== null && isValidOnboardingPhone(user.phoneE164);
  const strongAuthRequired = requiresStrongAuthRole(user.role);
  const requiredActions: Array<"set_profile" | "configure_strong_auth"> = [];
  const reasons: string[] = [];

  if (!hasPhone) {
    requiredActions.push("set_profile");
    reasons.push("phone_required");
  }

  if (strongAuthRequired && !user.strongAuthConfigured) {
    requiredActions.push("configure_strong_auth");
    reasons.push("strong_auth_required");
  }

  const optionalActions: Array<"configure_totp" | "configure_passkey"> = [];
  if (!strongAuthRequired) {
    optionalActions.push("configure_passkey", "configure_totp");
  }

  const sessionState = resolveOnboardingSessionState({
    onboardingCompleted: user.onboardingCompletedAt !== null,
    hasPhone,
    requiresStrongAuth: strongAuthRequired,
    strongAuthConfigured: user.strongAuthConfigured,
  });
  const canAccessApp = sessionState === "app_ready";

  return {
    sessionState,
    requiredActions,
    optionalActions,
    canAccessApp,
    nextRoute: canAccessApp ? getDefaultAppPath(user.role) : "/onboarding",
    reasons,
  };
}
