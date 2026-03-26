import type { createRepositories } from "~/server/shared/registry";

export type RepositoryTransactionRunner = <T>(
  operation: (
    transactionRepos: ReturnType<typeof createRepositories>,
  ) => Promise<T>,
) => Promise<T>;
