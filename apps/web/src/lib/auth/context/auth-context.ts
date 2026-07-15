import type { Selectable } from "kysely";

import type { UsersTable } from "~/lib/db/types";
import type { UserId } from "~/server/shared/ids";

import {
  getStrongAuthStatus,
  type StrongAuthStatus,
} from "../security/strong-auth-status";
import type { AuthContextDeps } from "../types";

type UserRow = Selectable<UsersTable>;

export type AuthContextUser = Pick<
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
>;

export interface AuthContext {
  user: AuthContextUser;
  strongAuthStatus: StrongAuthStatus;
  recoveryCodesAcknowledgementRequired: boolean;
}

export async function loadActiveAuthContextForUser(
  user: UserRow,
  deps: AuthContextDeps,
  now: Date,
): Promise<AuthContext | null> {
  if (!user.is_active) {
    return null;
  }
  if (user.expires_at !== null && user.expires_at <= now) {
    await deps.users.deactivateIfExpired(user.id, now);
    return null;
  }

  const [strongAuthStatus, recoveryCodeSet] = await Promise.all([
    getStrongAuthStatus(user.id, deps),
    deps.userRecoveryCodes.getActiveSet(user.id),
  ]);

  return {
    user,
    strongAuthStatus,
    recoveryCodesAcknowledgementRequired:
      recoveryCodeSet !== null && recoveryCodeSet.acknowledgedAt === null,
  };
}

export async function loadActiveAuthContext(
  userId: UserId,
  deps: AuthContextDeps,
  now: Date,
): Promise<AuthContext | null> {
  const user = await deps.users.findById(userId);
  return user ? loadActiveAuthContextForUser(user, deps, now) : null;
}
