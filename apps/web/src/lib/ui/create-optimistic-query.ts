import { createAsync, revalidate as revalidateQuery } from "@solidjs/router";
import { createEffect, createSignal, on } from "solid-js";

interface UpdateOptions<T> {
  optimistic: (current: T) => T;
  /**
   * Action to call to persist the change. Use `useAction(mutation)` from
   * `lib/mutations/` so the framework automatically revalidates the query via
   * the action's `json({ revalidate })` return value. When the query data
   * updates, the overlay is cleared and the UI shows confirmed server state.
   */
  commit: () => Promise<void>;
}

interface OptimisticQueryResult<T> {
  data: () => T;
  update: (options: UpdateOptions<T>) => Promise<void>;
  /** Explicitly revalidate without an optimistic overlay (e.g. after a
   *  mutation whose result cannot be predicted client-side). */
  invalidate: () => Promise<void>;
}

export function createOptimisticQuery<T>(
  query: { (): Promise<T>; key: string },
  options: { initialValue: T },
): OptimisticQueryResult<T> {
  const asyncData = createAsync(query, { initialValue: options.initialValue });
  const [overlay, setOverlay] = createSignal<T | undefined>(undefined);

  // When the server delivers fresh data (triggered by the action's revalidate
  // hint), clear any pending overlay so the UI shows confirmed state rather
  // than staying stuck on the optimistic value.
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

  const update = async ({ optimistic, commit }: UpdateOptions<T>) => {
    const previous = data();
    setOverlay(() => optimistic(previous));
    try {
      await commit();
      // The action's json({ revalidate }) triggers query revalidation.
      // When asyncData() updates, the effect above clears the overlay.
    } catch (error) {
      setOverlay(() => previous);
      throw error;
    }
  };

  return { data, update, invalidate };
}
