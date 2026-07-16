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
