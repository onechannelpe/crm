import { createPasswordResetTokensRepo } from "~/server/auth/repos-password-reset";
import type { MessagingGateway } from "~/server/notifications/messaging-gateway";
import type { DatabaseExecutor } from "~/server/shared/db-executor";
import type { RepositoryTransactionRunner } from "~/server/shared/transaction";
import { createUsersRepo } from "~/server/users/repos-users";

interface PasswordResetContextDeps {
  executor: DatabaseExecutor;
  messaging: MessagingGateway;
}

export function createPasswordResetContext(deps: PasswordResetContextDeps) {
  const runInRepositoryTransaction: RepositoryTransactionRunner<
    ReturnType<typeof createPasswordResetRepos>
  > = (operation) =>
    deps.executor
      .transaction()
      .execute((transactionDb) =>
        operation(createPasswordResetRepos(transactionDb)),
      );

  return {
    repos: createPasswordResetRepos(deps.executor),
    runInRepositoryTransaction,
    messaging: deps.messaging,
  };
}

function createPasswordResetRepos(executor: DatabaseExecutor) {
  return {
    users: createUsersRepo(executor),
    passwordResetTokens: createPasswordResetTokensRepo(executor),
  };
}

type PasswordResetContext = ReturnType<typeof createPasswordResetContext>;

export type PasswordResetRequestContext = Pick<
  PasswordResetContext,
  "repos" | "messaging" | "runInRepositoryTransaction"
>;
