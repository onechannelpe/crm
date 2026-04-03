import { db } from "~/lib/db/db";
import { createPasswordResetTokensRepo } from "~/server/auth/repos-password-reset";
import { getNotificationRuntime } from "~/server/notifications/runtime";
import { createUsersRepo } from "~/server/users/repos-users";

const { notificationSender } = getNotificationRuntime();

export function createPasswordResetContext() {
  return {
    repos: {
      users: createUsersRepo(db),
      passwordResetTokens: createPasswordResetTokensRepo(db),
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
