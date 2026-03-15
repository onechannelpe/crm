import type { User } from "~/lib/db/types";
import type { Repositories } from "~/server/shared/registry";

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

type AuthContextDeps = Pick<
  Repositories,
  "users" | "passkeys" | "userTotpFactors"
>;

export async function loadActiveAuthContext(
  userId: number,
  deps: AuthContextDeps,
): Promise<AuthContext | null> {
  const user = await deps.users.findById(userId);
  if (!user || !user.is_active) {
    return null;
  }

  return {
    user,
    strongAuthStatus: await getStrongAuthStatus(user.id, deps),
  };
}
