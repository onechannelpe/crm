import type { User } from "~/lib/db/types";

import type { StrongAuthStatus } from "../security/strong-auth-status";
import { requiresStrongAuthRole } from "../security/strong-auth-status";
import type { AuthProof, LoginDecision } from "./policy-types";

export interface LoginPolicyInput {
  proof: AuthProof;
  context: {
    user: {
      role: User["role"];
      onboarding_completed_at: number | null;
    };
    strongAuthStatus: StrongAuthStatus;
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
