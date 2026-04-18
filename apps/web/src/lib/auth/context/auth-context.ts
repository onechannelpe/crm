import type { Selectable } from "kysely";

import type { UsersTable } from "~/lib/db/types";
import type { BranchId, UserId } from "~/server/shared/ids";

import {
  getStrongAuthStatus,
  type StrongAuthStatus,
} from "../security/strong-auth-status";
import type { AuthContextDeps } from "../types";

type UserRow = Selectable<UsersTable>;

export type AuthContextUser = Omit<
  Pick<
    UserRow,
    | "id"
    | "email"
    | "names"
    | "first_surname"
    | "second_surname"
    | "branch_id"
    | "role"
    | "username"
    | "onboarding_completed_at"
    | "is_active"
  >,
  "id" | "branch_id"
> & {
  id: UserId;
  branch_id: BranchId;
};

export interface AuthContext {
  user: AuthContextUser;
  strongAuthStatus: StrongAuthStatus;
}

export async function loadActiveAuthContext(
  userId: UserId,
  deps: AuthContextDeps,
): Promise<AuthContext | null> {
  const now = Date.now();
  const user = await deps.users.findById(userId);
  if (!user || !user.is_active) {
    return null;
  }
  if (user.expires_at !== null && user.expires_at <= now) {
    await deps.users.deactivateIfExpired(userId, now);
    return null;
  }

  return {
    user,
    strongAuthStatus: await getStrongAuthStatus(userId, deps),
  };
}
