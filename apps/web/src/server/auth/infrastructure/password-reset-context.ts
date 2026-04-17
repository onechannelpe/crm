import { createPasswordResetTokensRepo } from "~/server/auth/repos-password-reset";
import type { MessagingGateway } from "~/server/notifications/messaging-gateway";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import { createUsersRepo } from "~/server/users/repos-users";

interface PasswordResetContextDeps {
  executor: DatabaseExecutor;
  messaging: MessagingGateway;
}

export function createPasswordResetContext(deps: PasswordResetContextDeps) {
  return {
    repos: {
      users: createUsersRepo(deps.executor),
      passwordResetTokens: createPasswordResetTokensRepo(deps.executor),
    },
    messaging: deps.messaging,
  };
}

type PasswordResetContext = ReturnType<typeof createPasswordResetContext>;

export type PasswordResetRepos = PasswordResetContext["repos"];
export type PasswordResetRequestContext = Pick<
  PasswordResetContext,
  "repos" | "messaging"
>;
