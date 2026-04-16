export type TransactionRunner = {
  runInTransaction<T>(operation: () => Promise<T>): Promise<T>;
};
