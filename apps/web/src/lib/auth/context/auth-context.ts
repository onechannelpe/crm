import type { User } from "~/lib/db/types";
import type { createUserTotpFactorsRepo } from "~/server/auth/repos-user-totp-factors";
import type { UserId } from "~/server/shared/ids";
import type { createPasskeysRepo } from "~/server/users/repos-passkeys";
import type { createUsersRepo } from "~/server/users/repos-users";

import {
  getStrongAuthStatus,
  type StrongAuthStatus,
} from "../security/strong-auth-status";

export type AuthContextUser = Pick<
  User,
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
>;

export interface AuthContext {
  user: AuthContextUser;
  strongAuthStatus: StrongAuthStatus;
}

type AuthContextDeps = {
  users: ReturnType<typeof createUsersRepo>;
  passkeys: ReturnType<typeof createPasskeysRepo>;
  userTotpFactors: ReturnType<typeof createUserTotpFactorsRepo>;
};

export async function loadActiveAuthContext(
  userId: UserId,
  deps: AuthContextDeps,
): Promise<AuthContext | null> {
  const user = await deps.users.findById(userId);
  if (!user || !user.is_active) {
    return null;
  }

  return {
    user,
    strongAuthStatus: await getStrongAuthStatus(userId, deps),
  };
}
