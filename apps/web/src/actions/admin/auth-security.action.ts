import { longName } from "~/domain/identity/display-name";
import { composeAuth } from "~/server/auth/ui/composition";
import { executeAdminServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { Ok } from "~/shared/result";

export interface UserLoginRetryReport {
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    isActive: boolean;
  };
  retryCount15m: number;
  retryCount24h: number;
  recentRetries: Array<{
    id: string;
    createdAt: number;
    stage: string;
    outcome: string;
    reason: string | null;
  }>;
}

export async function getUserLoginRetryReport(
  username: unknown,
): Promise<UserLoginRetryReport | null> {
  "use server";

  return executeAdminServerFunction({
    name: "admin.auth.login_retry_report.read",
    access: { kind: "role", role: "admin" },
    stepUp: "recent_strong_auth",

    parse: () =>
      parseObject({ username }, validationFail, (r) => ({
        username: r.str("username").trim().toLowerCase(),
      })),

    execute: async (_ctx, input) => {
      const { users, authEvents } = composeAuth().login.repos;

      const user = await users.findByUsername(input.username);

      if (!user) {
        return Ok(null);
      }

      const now = new Date();
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60_000);
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60_000);

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
          isActive: user.is_active,
        },
        retryCount15m,
        retryCount24h,
        recentRetries: recentRetries.map((event) => ({
          id: event.id,
          createdAt: event.created_at.getTime(),
          stage: event.stage,
          outcome: event.outcome,
          reason: event.reason,
        })),
      });
    },
  });
}
