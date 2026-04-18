import type { Selectable } from "kysely";

import type { AuthSession } from "~/lib/auth/access/session-types";
import type { Database, UsersTable } from "~/lib/db/types";
import {
  asBranchId,
  asUserId,
  type BranchId,
  type UserId,
} from "~/server/shared/ids";

type UserRow = Selectable<UsersTable>;
type UserSessionRow = Selectable<Database["user_sessions"]>;

type SessionIdentitySource = Omit<
  Pick<UserRow, "id" | "branch_id" | "role" | "onboarding_completed_at">,
  "id" | "branch_id"
> & {
  id: UserId;
  branch_id: BranchId;
};

type PersistedSessionSource = Omit<
  Pick<
    UserSessionRow,
    | "user_id"
    | "branch_id"
    | "role"
    | "session_class"
    | "primary_auth_method"
    | "strong_auth_method"
    | "strong_auth_at"
  >,
  "user_id" | "branch_id"
> & {
  user_id: UserId;
  branch_id: BranchId;
};

export interface SessionIdentity {
  userId: UserId;
  branchId: BranchId;
  role: UserRow["role"];
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
