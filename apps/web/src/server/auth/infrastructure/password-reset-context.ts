import { createPasswordResetTokensRepo } from "~/server/auth/repos-password-reset";
import type { createNotificationsRuntime } from "~/server/runtime/notifications-runtime";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createUsersRepo } from "~/server/users/repos-users";

interface PasswordResetContextDeps {
  executor: DatabaseExecutor;
  notificationSender: ReturnType<
    typeof createNotificationsRuntime
  >["notificationSender"];
}

export function createPasswordResetContext(deps: PasswordResetContextDeps) {
  return {
    repos: {
      users: createUsersRepo(deps.executor),
      passwordResetTokens: createPasswordResetTokensRepo(deps.executor),
    },
    notificationSender: deps.notificationSender,
  };
}

type PasswordResetContext = ReturnType<typeof createPasswordResetContext>;

export type PasswordResetRepos = PasswordResetContext["repos"];
export type PasswordResetRequestContext = Pick<
  PasswordResetContext,
  "repos" | "notificationSender"
>;
