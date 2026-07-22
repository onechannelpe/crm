import {
  createEffect,
  createSignal,
  on,
  onCleanup,
  type Accessor,
} from "solid-js";

import { createEventSourceStream } from "./event-source-stream";

export function useEventFeed<T>(
  url: Accessor<string | null>,
  parse: (raw: string) => T | null,
  options?: {
    limit?: number;
    resetKey?: Accessor<unknown>;
  },
): Accessor<T[]> {
  const [records, setRecords] = createSignal<T[]>([]);

  if (options?.resetKey) {
    createEffect(on(options.resetKey, () => setRecords([])));
  }

  createEffect(() => {
    const currentUrl = url();

    if (currentUrl === null || typeof window === "undefined") {
      return;
    }

    const stream = createEventSourceStream({
      onMessage: (raw) => {
        const parsed = parse(raw);

        if (parsed === null) {
          return;
        }

        setRecords((previous) => {
          const next = [parsed, ...previous];

          return options?.limit === undefined
            ? next
            : next.slice(0, options.limit);
        });
      },
    });

    stream.connect(currentUrl);

    onCleanup(() => stream.disconnect());
  });

  return records;
}
