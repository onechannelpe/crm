interface RunOptimisticOptions<T> {
  read: () => T;
  write: (next: T) => void;
  optimistic: (current: T) => T;
  commit: () => Promise<void>;
  reconcile?: () => Promise<unknown> | void;
}

export async function runOptimistic<T>(
  options: RunOptimisticOptions<T>,
): Promise<void> {
  const previous = options.read();
  options.write(options.optimistic(previous));

  try {
    await options.commit();
  } catch (error) {
    options.write(previous);
    throw error;
  } finally {
    const reconcile = options.reconcile;
    if (reconcile) {
      void reconcile();
    }
  }
}
