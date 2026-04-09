import { createPasswordResetTokensRepo } from "~/server/auth/repos-password-reset";
import { getNotificationRuntime } from "~/server/notifications/runtime";
import { serverRuntime } from "~/server/runtime";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createUsersRepo } from "~/server/users/repos-users";

const { notificationSender } = getNotificationRuntime();

export function createPasswordResetContext(
  executor: DatabaseExecutor = serverRuntime.infra.db,
) {
  return {
    repos: {
      users: createUsersRepo(executor),
      passwordResetTokens: createPasswordResetTokensRepo(executor),
    },
    notificationSender,
  };
}

type PasswordResetContext = ReturnType<typeof createPasswordResetContext>;

export type PasswordResetRepos = PasswordResetContext["repos"];
export type PasswordResetRequestContext = Pick<
  PasswordResetContext,
  "repos" | "notificationSender"
>;
