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

type PasswordResetContext = ReturnType<typeof createPasswordResetContext>;

export type PasswordResetRepos = PasswordResetContext["repos"];
export type PasswordResetRequestContext = Pick<
  PasswordResetContext,
  "repos" | "notificationSender"
>;
