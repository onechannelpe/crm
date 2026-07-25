import { createAsync, revalidate as revalidateQuery } from "@solidjs/router";
import { createEffect, createSignal, on } from "solid-js";

interface UpdateOptions<T, TResult> {
  optimistic: (current: T) => T;
  // The action must revalidate the query so fresh data clears the overlay.
  commit: () => Promise<TResult>;
}

interface OptimisticQueryResult<T> {
  data: () => T;
  update: <TResult>(options: UpdateOptions<T, TResult>) => Promise<TResult>;
  invalidate: () => Promise<void>;
}

export function createOptimisticQuery<T>(
  query: { (): Promise<T>; key: string },
  options: { initialValue: T },
): OptimisticQueryResult<T> {
  const asyncData = createAsync(query, { initialValue: options.initialValue });
  const [overlay, setOverlay] = createSignal<T>();

  // Fresh server data replaces the optimistic value.
  createEffect(
    on(
      asyncData,
      () => {
        if (overlay() !== undefined) {
          setOverlay(undefined);
        }
      },
      { defer: true },
    ),
  );

  // .latest keeps the previous value without suspending.
  const data = () => overlay() ?? asyncData.latest ?? options.initialValue;

  const invalidate = async () => {
    await revalidateQuery(query.key);
    setOverlay(undefined);
  };

  const update = async <TResult>({
    optimistic,
    commit,
  }: UpdateOptions<T, TResult>) => {
    const previous = data();

    setOverlay(() => optimistic(previous));

    try {
      return await commit();
    } catch (error) {
      setOverlay(() => previous);
      throw error;
    }
  };

  return { data, update, invalidate };
}
