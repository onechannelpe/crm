import { notificationSender, repos } from "~/server/shared/context";

export function createPasswordResetContext() {
  return {
    repos: {
      users: repos.users,
      passwordResetTokens: repos.passwordResetTokens,
    },
    notificationSender,
  };
}

export type PasswordResetContext = ReturnType<
  typeof createPasswordResetContext
>;
