import { createAsync, revalidate as revalidateQuery } from "@solidjs/router";
import { createSignal } from "solid-js";

interface UpdateOptions<T> {
  optimistic: (current: T) => T;
  commit: () => Promise<void>;
  /** Re-fetch from server after commit. Defaults to false. */
  reconcile?: boolean;
}

interface OptimisticQueryResult<T> {
  data: () => T;
  update: (options: UpdateOptions<T>) => Promise<void>;
  invalidate: () => Promise<void>;
}

export function createOptimisticQuery<T>(
  query: { (): Promise<T>; key: string },
  options: { initialValue: T },
): OptimisticQueryResult<T> {
  const asyncData = createAsync(query, { initialValue: options.initialValue });
  const [overlay, setOverlay] = createSignal<T | undefined>(undefined);

  const data = () => overlay() ?? asyncData();

  const invalidate = async () => {
    await revalidateQuery(query.key);
    setOverlay(undefined);
  };

  const update = async ({ optimistic, commit, reconcile = false }: UpdateOptions<T>) => {
    const previous = data();
    setOverlay(() => optimistic(previous));
    try {
      await commit();
    } catch (error) {
      setOverlay(() => previous);
      throw error;
    } finally {
      if (reconcile) {
        void invalidate();
      }
    }
  };

  return { data, update, invalidate };
}
