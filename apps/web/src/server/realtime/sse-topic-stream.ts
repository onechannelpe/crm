import { createEventStream, type EventStream, type H3Event } from "h3";

import type { RealtimePeer, TopicHub } from "./topic-hub";

// Adapts one h3 EventStream into a TopicHub peer: subscribes immediately (so
// no broadcast is missed while a caller replays history afterward) and
// unsubscribes when the request ends. `push` on a closed writer rejects
// asynchronously, which TopicHub's synchronous try/catch can't observe, so a
// failed push removes the peer itself instead of leaking an unhandled
// rejection.
export function openTopicStream(
  h3Event: H3Event,
  hub: TopicHub,
  topic: string,
  eventId?: (rawMessage: string) => string | undefined,
): EventStream {
  const stream = createEventStream(h3Event);

  const peer: RealtimePeer = {
    send: (message) => {
      const id = eventId?.(message);
      return stream.push(id ? { id, data: message } : message).catch(() => {
        hub.removePeer(peer);
      });
    },
  };

  hub.subscribe(peer, topic);
  stream.onClosed(() => hub.removePeer(peer));

  return stream;
}
