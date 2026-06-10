"use server";

import type { Selectable } from "kysely";

import type { Database } from "~/lib/db/types";
import { longName } from "~/lib/users/display-name";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Ok } from "~/server/shared/result";

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
  username: unknown,
): Promise<UserLoginRetryReport | null> {
  return runAction({
    name: "admin.auth.login_retry_report.read",
    access: { kind: "role", role: "admin" },
    stepUp: "recent_strong_auth",

    parse: () =>
      parseObject({ username }, validationFail, (r) => ({
        username: r.str("username").trim().toLowerCase(),
      })),

    execute: async (_ctx, input) => {
      const { users, authEvents } = getServerRuntime().auth.login.repos;

      const user = await users.findByUsername(input.username);

      if (!user) {
        return Ok(null);
      }

      const now = Date.now();
      const fifteenMinutesAgo = now - 15 * 60_000;
      const twentyFourHoursAgo = now - 24 * 60 * 60_000;

      const [retryCount15m, retryCount24h, recentRetries] = await Promise.all([
        authEvents.countLoginRetriesSince(user.id, fifteenMinutesAgo),
        authEvents.countLoginRetriesSince(user.id, twentyFourHoursAgo),
        authEvents.findRecentLoginRetriesByUser(user.id, 25),
      ]);

      return Ok({
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
      });
    },
  });
}
