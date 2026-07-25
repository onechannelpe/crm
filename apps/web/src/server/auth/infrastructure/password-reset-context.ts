import { createPasswordResetTokensRepo } from "~/server/auth/repos-password-reset";
import type { MessagingGateway } from "~/server/notifications/channels/messaging-gateway";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import { createExecutorUow } from "~/server/platform/database/uow";
import { createUsersRepo } from "~/server/users/repos-users";

type PasswordResetRepos = {
  users: ReturnType<typeof createUsersRepo>;
  passwordResetTokens: ReturnType<typeof createPasswordResetTokensRepo>;
};

interface PasswordResetContextDeps {
  executor: DatabaseExecutor;
  messaging: MessagingGateway;
}

export function createPasswordResetContext(deps: PasswordResetContextDeps) {
  const repos: PasswordResetRepos = {
    users: createUsersRepo(deps.executor),
    passwordResetTokens: createPasswordResetTokensRepo(deps.executor),
  };

  return {
    repos,
    uow: createExecutorUow(
      deps.executor,
      (txDb): PasswordResetRepos => ({
        users: createUsersRepo(txDb),
        passwordResetTokens: createPasswordResetTokensRepo(txDb),
      }),
    ),
    messaging: deps.messaging,
  };
}

type PasswordResetContext = ReturnType<typeof createPasswordResetContext>;

export type PasswordResetRequestContext = Pick<
  PasswordResetContext,
  "repos" | "messaging" | "uow"
>;
