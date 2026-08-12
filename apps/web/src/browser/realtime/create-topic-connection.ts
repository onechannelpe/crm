import { createEffect, createSignal, onCleanup, type Accessor } from "solid-js";

import type {
  RealtimeChannelName,
  RealtimeMessage,
} from "~/contracts/realtime/channel";

import { startConnection, type ConnectionState } from "./connection-lifecycle";
import { readRealtimeStream } from "./read-realtime-stream";

interface TopicConnectionOptions {
  channel: RealtimeChannelName;

  // Null disconnects until a target is provided.
  id: Accessor<string | null>;

  onMessage: (message: RealtimeMessage) => void;

  // Prevents reconnecting after the target reaches a terminal state.
  stopped?: Accessor<boolean>;
}

export function createTopicConnection(
  options: TopicConnectionOptions,
): Accessor<ConnectionState> {
  const [state, setState] = createSignal<ConnectionState>("idle");

  createEffect(() => {
    const id = options.id();

    if (id === null || options.stopped?.() === true) {
      setState("idle");
      return;
    }

    const dispose = startConnection({
      channel: options.channel,
      id,
      onMessage: options.onMessage,
      readStream: readRealtimeStream,
      setState,
    });

    onCleanup(dispose);
  });

  return state;
}
