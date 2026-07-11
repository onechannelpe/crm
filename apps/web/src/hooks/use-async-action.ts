import { createSignal } from "solid-js";

// useSubmission from @solidjs/router owns pending state for SolidStart actions;
// this hook is for client-side promise functions only.
export function useAsyncAction<TArgs extends unknown[]>(
  fn: (...args: TArgs) => Promise<void>,
): [execute: (...args: TArgs) => Promise<void>, isPending: () => boolean] {
  const [pending, setPending] = createSignal(false);

  const execute = async (...args: TArgs): Promise<void> => {
    setPending(true);
    try {
      await fn(...args);
    } finally {
      setPending(false);
    }
  };

  return [execute, pending];
}
