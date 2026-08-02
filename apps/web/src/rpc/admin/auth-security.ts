import { longName } from "~/domain/identity/display-name";
import { application } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
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

  return executeSessionServerFunction({
    name: "admin.auth.login_retry_report.read",
    access: { kind: "role", role: "admin" },
    stepUp: "recent_strong_auth",

    parse: () =>
      parseObject({ username }, validationFail, (r) => ({
        username: r.str("username").trim().toLowerCase(),
      })),

    execute: async (ctx, input) => {
      const report = await application.auth.admin.loginRetries(
        input.username,
        ctx,
      );
      if (!report) {
        return Ok(null);
      }

      return Ok({
        user: {
          id: report.user.id,
          email: report.user.email,
          fullName: longName(report.user),
          role: report.user.role,
          isActive: report.user.is_active,
        },
        retryCount15m: report.retryCount15m,
        retryCount24h: report.retryCount24h,
        recentRetries: report.recentRetries.map((event) => ({
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
