import { createAsync, revalidate } from "@solidjs/router";
import { createSignal } from "solid-js";

interface OptimisticQueryResult<T> {
  data: () => T;
  write: (value: T) => void;
  revalidate: () => Promise<void>;
}

export function createOptimisticQuery<T>(
  queryFn: () => Promise<T>,
  options: { initialValue: T; key: string },
): OptimisticQueryResult<T> {
  const asyncData = createAsync(queryFn, { initialValue: options.initialValue });
  const [overlay, setOverlay] = createSignal<T | undefined>(undefined);

  const data = () => overlay() ?? asyncData();

  return {
    data,
    write: (value: T) => setOverlay(() => value),
    revalidate: async () => {
      await revalidate(options.key);
      setOverlay(undefined);
    },
  };
}
