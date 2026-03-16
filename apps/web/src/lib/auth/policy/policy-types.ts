import type { SessionClass, StrongAuthMethod } from "../core/session-contract";

export type AuthProof =
  | {
      kind: "password";
      userId: number;
    }
  | {
      kind: "google";
      userId: number;
      trustedFederatedMfa: boolean;
    }
  | {
      kind: "passkey";
      userId: number;
    };

export type LoginDecision =
  | {
      kind: "issue_session";
      sessionClass: SessionClass;
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
