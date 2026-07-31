import { createEffect, createSignal, on, type Accessor } from "solid-js";

import type { RealtimeChannelName } from "~/contracts/realtime/channel";

import { createTopicConnection } from "./create-topic-connection";

export interface TopicStateOptions<T> {
  channel: RealtimeChannelName;
  id: Accessor<string | null>;
  parse: (raw: string) => T | null;

  // Close the connection once the value can no longer change.
  isFinal?: (value: T) => boolean;
}

export function createTopicState<T>(
  options: TopicStateOptions<T>,
): Accessor<T | undefined> {
  const [value, setValue] = createSignal<T | undefined>();
  const [final, setFinal] = createSignal(false);

  createEffect(
    on(options.id, () => {
      setValue(undefined);
      setFinal(false);
    }),
  );

  createTopicConnection({
    channel: options.channel,
    id: options.id,
    stopped: final,
    onMessage: (message) => {
      const parsed = options.parse(message.data);

      if (parsed === null) {
        return;
      }

      setValue(() => parsed);

      if (options.isFinal?.(parsed)) {
        setFinal(true);
      }
    },
  });

  return value;
}
