import type { Role } from "~/domain/auth/access/rbac";
import { resolveSessionClass } from "~/domain/auth/core/session-contract";
import type { Clock } from "~/domain/time/clock";

import { requiresStrongAuthRole } from "./rules/role";
import type { AuthProof, LoginDecision } from "./types";

export interface LoginPolicyInput {
  proof: AuthProof;
  context: {
    user: {
      role: Role;
      onboarding_completed_at: Date | null;
    };
    strongAuthStatus: {
      hasTotp: boolean;
      hasPasskey: boolean;
      hasVerifiedStrongAuth: boolean;
    };
    recoveryCodesAcknowledgementRequired: boolean;
  };
  now?: Clock;
}

export function evaluateLoginPolicy(input: LoginPolicyInput): LoginDecision {
  const now = input.now ?? (() => new Date());
  const { proof, context } = input;
  const onboardingCompleted = context.user.onboarding_completed_at !== null;
  const sessionClass = resolveSessionClass({
    onboardingCompleted,
    recoveryCodesAcknowledgementRequired:
      context.recoveryCodesAcknowledgementRequired,
  });

  if (proof.kind === "passkey") {
    return {
      kind: "issue_session",
      sessionClass,
      strongAuthMethod: "passkey",
      strongAuthAt: now(),
    };
  }

  if (proof.kind === "google" && proof.trustedFederatedMfa) {
    return {
      kind: "issue_session",
      sessionClass,
      strongAuthMethod: "federated",
      strongAuthAt: now(),
    };
  }

  if (!requiresStrongAuthRole(context.user.role)) {
    return {
      kind: "issue_session",
      sessionClass,
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
