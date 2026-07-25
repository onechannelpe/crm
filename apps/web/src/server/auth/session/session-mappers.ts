import type { Selectable } from "kysely";

import type { AuthSession } from "~/domain/auth/access/session-types";
import type { BranchId, UserId } from "~/domain/ids";
import type { Database, UsersTable } from "~/server/platform/database/types";

type UserRow = Selectable<UsersTable>;
type UserSessionRow = Selectable<Database["user_sessions"]>;

type SessionIdentitySource = Pick<
  UserRow,
  "id" | "branch_id" | "role" | "onboarding_completed_at"
>;

type PersistedSessionSource = Pick<
  UserSessionRow,
  | "user_id"
  | "branch_id"
  | "role"
  | "session_class"
  | "primary_auth_method"
  | "strong_auth_method"
  | "strong_auth_at"
  | "impersonator_user_id"
>;

export interface SessionIdentity {
  userId: UserId;
  branchId: BranchId;
  role: UserRow["role"];
}

export function mapUserToSessionIdentity(
  user: SessionIdentitySource,
): SessionIdentity {
  return {
    userId: user.id,
    branchId: user.branch_id,
    role: user.role,
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
    sessionClass: session.session_class,
    primaryAuthMethod: session.primary_auth_method,
    strongAuthMethod: session.strong_auth_method,
    strongAuthAt: session.strong_auth_at,
    impersonatorUserId: session.impersonator_user_id,
  };
}
