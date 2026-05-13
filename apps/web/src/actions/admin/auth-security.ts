"use server";

import type { Selectable } from "kysely";

import { requireRole } from "~/lib/auth/access/session";
import { assertRecentStrongAuth } from "~/lib/auth/security/step-up";
import { assertNonEmptyString } from "~/contracts/guards";
import type { Database } from "~/lib/db/types";
import { longName } from "~/lib/users/display-name";
import { getServerRuntime } from "~/server/runtime";

type AuthEventRow = Selectable<Database["auth_events"]>;

export interface UserLoginRetryReport {
  user: {
    id: number;
    email: string;
    fullName: string;
    role: string;
    isActive: boolean;
  };
  retryCount15m: number;
  retryCount24h: number;
  recentRetries: AuthEventRow[];
}

export async function getUserLoginRetryReport(
  username: string,
): Promise<UserLoginRetryReport | null> {
  const { users, authEvents } = getServerRuntime().auth.login.repos;
  const safeUsername = assertNonEmptyString(username, "username").toLowerCase();
  const session = await requireRole("admin");
  assertRecentStrongAuth(session);
  const user = await users.findByUsername(safeUsername);
  if (!user) return null;

  const now = Date.now();
  const [retryCount15m, retryCount24h, recentRetries] = await Promise.all([
    authEvents.countLoginRetriesSince(user.id, now - 15 * 60_000),
    authEvents.countLoginRetriesSince(user.id, now - 24 * 60 * 60_000),
    authEvents.findRecentLoginRetriesByUser(user.id, 25),
  ]);

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: longName(user),
      role: user.role,
      isActive: user.is_active === 1,
    },
    retryCount15m,
    retryCount24h,
    recentRetries,
  };
}
