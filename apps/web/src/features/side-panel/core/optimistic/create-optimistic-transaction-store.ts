import type {
  OptimisticTransactionId,
  OptimisticTransactionSpec,
  OptimisticTransactionStore,
} from "./types";

let nextTransactionId = 1;

export function createOptimisticTransactionStore(): OptimisticTransactionStore {
  const rollbackById = new Map<OptimisticTransactionId, () => void>();

  function begin(spec: OptimisticTransactionSpec): OptimisticTransactionId {
    const transactionId = `optimistic:${nextTransactionId++}`;
    rollbackById.set(transactionId, spec.apply());
    return transactionId;
  }

  function commit(id: OptimisticTransactionId) {
    rollbackById.delete(id);
  }

  function rollback(id: OptimisticTransactionId) {
    const rollbackFn = rollbackById.get(id);
    rollbackById.delete(id);
    rollbackFn?.();
  }

  return {
    begin,
    commit,
    rollback,
  };
}
