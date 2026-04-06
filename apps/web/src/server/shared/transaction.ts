export type RepositoryTransactionRunner<TRepos> = <T>(
  operation: (transactionRepos: TRepos) => Promise<T>,
) => Promise<T>;
