"use server";

import { requireRole } from "~/lib/auth/access/session";
import { assertRecentStrongAuth } from "~/lib/auth/security/step-up";
import { assertNonEmptyString } from "~/lib/contracts/guards";
import { repos } from "~/server/shared/context";

type RetryEvent = Awaited<
  ReturnType<typeof repos.authEvents.findRecentLoginRetriesByUser>
>[number];

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
  recentRetries: RetryEvent[];
}

export async function getUserLoginRetryReport(
  email: string,
): Promise<UserLoginRetryReport | null> {
  const safeEmail = assertNonEmptyString(email, "email").toLowerCase();
  const session = await requireRole("admin");
  assertRecentStrongAuth(session);
  const user = await repos.users.findByEmail(safeEmail);
  if (!user) return null;

  const now = Date.now();
  const [retryCount15m, retryCount24h, recentRetries] = await Promise.all([
    repos.authEvents.countLoginRetriesSince(user.id, now - 15 * 60_000),
    repos.authEvents.countLoginRetriesSince(user.id, now - 24 * 60 * 60_000),
    repos.authEvents.findRecentLoginRetriesByUser(user.id, 25),
  ]);

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      isActive: user.is_active === 1,
    },
    retryCount15m,
    retryCount24h,
    recentRetries,
  };
}
