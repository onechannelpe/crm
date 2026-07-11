import { createEffect, createSignal, onCleanup, type Accessor } from "solid-js";

import { createEventSourceStream } from "./event-source-stream";

export function useEventSourceRecords<T>(
  url: Accessor<string | null>,
  parse: (raw: string) => T | null,
  options?: { limit?: number },
): Accessor<T[]> {
  const [records, setRecords] = createSignal<T[]>([]);

  createEffect(() => {
    const currentUrl = url();
    setRecords([]);

    if (currentUrl === null || typeof window === "undefined") return;

    const stream = createEventSourceStream({
      onMessage: (raw) => {
        const parsed = parse(raw);
        if (!parsed) return;
        setRecords((previous) => {
          const next = [parsed, ...previous];
          return options?.limit ? next.slice(0, options.limit) : next;
        });
      },
    });

    stream.connect(currentUrl);
    onCleanup(() => stream.disconnect());
  });

  return records;
}
