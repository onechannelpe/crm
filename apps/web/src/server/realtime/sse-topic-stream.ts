import { createEventStream, type H3Event } from "h3";

import type { RealtimePeer, TopicHub } from "./topic-hub";

type EventStream = ReturnType<typeof createEventStream>;

interface TopicStreamOptions {
  /* Sent after subscribing so broadcasts cannot land before the snapshot */
  snapshot?: string;
  /* Added to each event so clients can resume with Last-Event-ID */
  eventId?: (rawMessage: string) => string | undefined;
}

// Remove the peer when an asynchronous stream push fails.
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

  if (options.snapshot !== undefined) {
    await stream.push(options.snapshot);
  }

  return stream;
}
