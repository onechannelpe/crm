import type {
  SessionClass,
  StrongAuthMethod,
} from "~/lib/auth/core/session-contract";
import type { UserId } from "~/server/shared/ids";

export type AuthProof =
  | {
      kind: "password";
      userId: UserId;
    }
  | {
      kind: "google";
      userId: UserId;
      trustedFederatedMfa: boolean;
    }
  | {
      kind: "passkey";
      userId: UserId;
    };

export type LoginDecision =
  | {
      kind: "issue_session";
      sessionClass: SessionClass;
      strongAuthMethod: StrongAuthMethod | null;
      strongAuthAt: Date | null;
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

export type AuthSessionState =
  | "pre_auth"
  | "onboarding_profile"
  | "onboarding_security_required"
  | "app_ready";

export interface OnboardingRequirements {
  sessionState: AuthSessionState;
  requiredActions: Array<"set_profile" | "configure_strong_auth">;
  optionalActions: Array<"configure_totp" | "configure_passkey">;
  canAccessApp: boolean;
  nextRoute: string;
  reasons: string[];
}
