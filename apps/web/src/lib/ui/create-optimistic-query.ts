import { createAsync, revalidate as revalidateQuery } from "@solidjs/router";
import { createEffect, createSignal, on } from "solid-js";

interface UpdateOptions<T, TResult> {
  optimistic: (current: T) => T;
  // commit should be a useAction(mutation) call: SolidStart revalidates the
  // query on the action's json({ revalidate }) return, which triggers the
  // effect that clears the overlay.
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

  const data = () =>
    overlay() ?? asyncData.latest ?? asyncData() ?? options.initialValue;

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
