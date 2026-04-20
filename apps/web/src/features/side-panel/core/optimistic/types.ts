export type OptimisticTransactionId = string;

export type OptimisticTransactionSpec = {
  apply: () => () => void;
};

export type OptimisticTransactionStore = {
  begin: (spec: OptimisticTransactionSpec) => OptimisticTransactionId;
  commit: (id: OptimisticTransactionId) => void;
  rollback: (id: OptimisticTransactionId) => void;
};
