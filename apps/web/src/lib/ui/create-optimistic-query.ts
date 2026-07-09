import { createAsync, revalidate as revalidateQuery } from "@solidjs/router";
import { createEffect, createSignal, on } from "solid-js";

interface UpdateOptions<T, TResult> {
  optimistic: (current: T) => T;
  // Use useAction(mutation) from lib/mutations/. SolidStart revalidates the
  // query via the action's json({ revalidate }) return; once the query updates,
  // the overlay clears.
  commit: () => Promise<TResult>;
}

interface OptimisticQueryResult<T> {
  data: () => T;
  update: <TResult>(options: UpdateOptions<T, TResult>) => Promise<TResult>;
  // For mutations whose result cannot be predicted client-side.
  invalidate: () => Promise<void>;
}

export function createOptimisticQuery<T>(
  query: { (): Promise<T>; key: string },
  options: { initialValue: T },
): OptimisticQueryResult<T> {
  const asyncData = createAsync(query, { initialValue: options.initialValue });
  const [overlay, setOverlay] = createSignal<T | undefined>(undefined);

  // Clear the overlay when fresh data arrives, so the UI shows confirmed
  // server state rather than a stuck optimistic value.
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

  const data = () => overlay() ?? asyncData();

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
