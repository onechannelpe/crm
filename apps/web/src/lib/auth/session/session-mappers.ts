import type { AuthSession } from "~/lib/auth/access/session-types";
import type { User, UserSession } from "~/lib/db/types";
import type { BranchId, UserId } from "~/server/shared/ids";

type SessionIdentitySource = Pick<
  User,
  "id" | "branch_id" | "role" | "onboarding_completed_at"
>;

type PersistedSessionSource = Pick<
  UserSession,
  | "user_id"
  | "branch_id"
  | "role"
  | "session_class"
  | "primary_auth_method"
  | "strong_auth_method"
  | "strong_auth_at"
>;

export interface SessionIdentity {
  userId: UserId;
  branchId: BranchId;
  role: User["role"];
  onboardingCompleted: boolean;
}

export function mapUserToSessionIdentity(
  user: SessionIdentitySource,
): SessionIdentity {
  return {
    userId: user.id,
    branchId: user.branch_id,
    role: user.role,
    onboardingCompleted: user.onboarding_completed_at !== null,
  };
}

export function mapUserSessionRowToAuthSession(
  sessionId: string,
  session: PersistedSessionSource,
): AuthSession {
  return {
    id: sessionId,
    userId: session.user_id,
    branchId: session.branch_id,
    role: session.role,
    onboardingCompleted: session.session_class === "app",
    sessionClass: session.session_class,
    primaryAuthMethod: session.primary_auth_method,
    strongAuthMethod: session.strong_auth_method,
    strongAuthAt: session.strong_auth_at,
  };
}
