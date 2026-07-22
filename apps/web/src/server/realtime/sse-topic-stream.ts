import { createEventStream, type H3Event } from "h3";

import type { RealtimePeer, TopicHub } from "./topic-hub";

type EventStream = ReturnType<typeof createEventStream>;

interface TopicStreamOptions {
  // Subscribe before fetching the snapshot so broadcasts cannot land in the
  // gap between the fetch and subscription. Events are complete snapshots, so
  // a broadcast racing the fetch is harmless.
  snapshot?: () => Promise<string | null>;

  // Lets clients resume with Last-Event-ID.
  eventId?: (rawMessage: string) => string | undefined;
}

export async function openTopicStream(
  h3Event: H3Event,
  hub: TopicHub,
  topic: string,
  options: TopicStreamOptions = {},
): Promise<EventStream> {
  const stream = createEventStream(h3Event);

  const peer: RealtimePeer = {
    send: (message) => {
      const id = options.eventId?.(message);
      const pushed = id
        ? stream.push({ id, data: message })
        : stream.push(message);

      return pushed.catch(() => {
        hub.removePeer(peer);
      });
    },
  };

  hub.subscribe(peer, topic);
  stream.onClosed(() => hub.removePeer(peer));

  if (options.snapshot) {
    const snapshot = await options.snapshot();

    if (snapshot !== null) {
      await stream.push(snapshot);
    }
  }

  return stream;
}
