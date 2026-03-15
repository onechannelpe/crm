import type { User } from "~/lib/db/types";

import {
  requiresStrongAuthRole,
  type StrongAuthStatus,
} from "../security/strong-auth-status";
import type { PrimaryAuthMethod, StrongAuthMethod } from "./session-contract";

export type LoginPolicyDecision =
  | {
      kind: "issue_preauth_session";
      strongAuthMethod: StrongAuthMethod | null;
      strongAuthAt: number | null;
    }
  | {
      kind: "issue_app_session";
      strongAuthMethod: StrongAuthMethod | null;
      strongAuthAt: number | null;
    }
  | {
      kind: "require_totp";
    }
  | {
      kind: "require_passkey";
    }
  | {
      kind: "deny";
      reason: "strong_auth_required";
    };

export interface LoginPolicyInput {
  user: Pick<User, "role" | "onboarding_completed_at">;
  strongAuthStatus: StrongAuthStatus;
  primaryAuthMethod: PrimaryAuthMethod;
  trustedFederatedMfa?: boolean;
  now?: () => number;
}

export function evaluateLoginPolicy(
  input: LoginPolicyInput,
): LoginPolicyDecision {
  const now = input.now ?? Date.now;
  const onboardingCompleted = input.user.onboarding_completed_at !== null;

  if (input.primaryAuthMethod === "passkey") {
    return onboardingCompleted
      ? {
          kind: "issue_app_session",
          strongAuthMethod: "passkey",
          strongAuthAt: now(),
        }
      : {
          kind: "issue_preauth_session",
          strongAuthMethod: "passkey",
          strongAuthAt: now(),
        };
  }

  if (
    input.primaryAuthMethod === "google" &&
    input.trustedFederatedMfa === true
  ) {
    return onboardingCompleted
      ? {
          kind: "issue_app_session",
          strongAuthMethod: "federated",
          strongAuthAt: now(),
        }
      : {
          kind: "issue_preauth_session",
          strongAuthMethod: "federated",
          strongAuthAt: now(),
        };
  }

  if (!requiresStrongAuthRole(input.user.role)) {
    return onboardingCompleted
      ? {
          kind: "issue_app_session",
          strongAuthMethod: null,
          strongAuthAt: null,
        }
      : {
          kind: "issue_preauth_session",
          strongAuthMethod: null,
          strongAuthAt: null,
        };
  }

  if (!onboardingCompleted) {
    return {
      kind: "issue_preauth_session",
      strongAuthMethod: null,
      strongAuthAt: null,
    };
  }

  if (!input.strongAuthStatus.hasVerifiedStrongAuth) {
    return {
      kind: "deny",
      reason: "strong_auth_required",
    };
  }

  if (input.strongAuthStatus.hasTotp) {
    return { kind: "require_totp" };
  }

  if (input.strongAuthStatus.hasPasskey) {
    return { kind: "require_passkey" };
  }

  return {
    kind: "deny",
    reason: "strong_auth_required",
  };
}
