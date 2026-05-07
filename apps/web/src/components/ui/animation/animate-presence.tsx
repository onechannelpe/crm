import { For, createEffect, createSignal, type JSX } from "solid-js";

interface PresenceEntry<T> {
  key: string;
  item: T;
  isPresent: boolean;
}

interface RenderPresenceState {
  isPresent: boolean;
  safeToRemove: () => void;
}

export interface AnimatePresenceProps<T> {
  each: readonly T[];
  getKey: (item: T) => string;
  mode?: "sync" | "wait";
  onExitComplete?: () => void;
  children: (item: T, presence: RenderPresenceState) => JSX.Element;
}

export function AnimatePresence<T>(props: AnimatePresenceProps<T>) {
  const [rendered, setRendered] = createSignal<PresenceEntry<T>[]>([]);
  const [pending, setPending] = createSignal<PresenceEntry<T>[] | null>(null);

  createEffect(() => {
    const nextItems = props.each;
    const nextKeys = new Set(nextItems.map((item) => props.getKey(item)));
    const current = rendered();

    const nextPresentEntries = nextItems.map((item) => ({
      key: props.getKey(item),
      item,
      isPresent: true,
    }));

    const exitingEntries = current
      .filter((entry) => !nextKeys.has(entry.key))
      .map((entry) => ({ ...entry, isPresent: false }));

    const hasExiting = exitingEntries.length > 0;

    if (props.mode === "wait" && hasExiting) {
      setPending(nextPresentEntries);
      setRendered(exitingEntries);
      return;
    }

    const merged = mergeWithExitingEntries(
      nextPresentEntries,
      current,
      nextKeys,
    );
    setPending(null);
    setRendered(merged);
  });

  const safeToRemove = (key: string) => {
    const current = rendered();
    const next = current.filter(
      (entry) => !(entry.key === key && !entry.isPresent),
    );

    if (next.length !== current.length) {
      setRendered(next);
    }

    const stillExiting = next.some((entry) => !entry.isPresent);
    if (stillExiting) return;

    const pendingEntries = pending();
    if (pendingEntries) {
      setPending(null);
      setRendered(pendingEntries);
    }

    props.onExitComplete?.();
  };

  return (
    <For each={rendered()}>
      {(entry) =>
        props.children(entry.item, {
          isPresent: entry.isPresent,
          safeToRemove: () => safeToRemove(entry.key),
        })
      }
    </For>
  );
}

function mergeWithExitingEntries<T>(
  nextPresentEntries: PresenceEntry<T>[],
  current: PresenceEntry<T>[],
  nextKeys: Set<string>,
): PresenceEntry<T>[] {
  const merged = [...nextPresentEntries];

  current.forEach((entry, index) => {
    if (!nextKeys.has(entry.key)) {
      merged.splice(index, 0, { ...entry, isPresent: false });
    }
  });

  return merged;
}
