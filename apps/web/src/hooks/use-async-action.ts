import { createSignal } from "solid-js";

/**
 * Wraps a prop-injected async callback with a pending signal.
 * Use this for component-local async callbacks (not SolidStart `action()`s).
 * For server actions, use `useSubmission()` instead.
 */
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
