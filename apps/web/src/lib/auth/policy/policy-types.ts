import type { UserId } from "~/server/shared/ids";

import type { SessionClass, StrongAuthMethod } from "../core/session-contract";

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
