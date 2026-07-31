import { createEventStream, type H3Event } from "h3";

import type { RealtimeMessage } from "~/contracts/realtime/channel";

import type { RealtimeEntry } from "./channel";
import { realtimeHub } from "./runtime";
import type { RealtimePeer, TopicHub } from "./topic-hub";

type EventStream = ReturnType<typeof createEventStream>;

export interface RealtimeSink {
  send: (messages: RealtimeMessage[]) => void;
  ping: () => void;
  close: () => void;
  onClosed: (listener: () => void) => void;
}

// Subscribe before reading the opening state so broadcasts received during the
// read can be buffered and appended afterward.
export async function attachRealtimeSubscription(
  hub: TopicHub,
  sink: RealtimeSink,
  entry: RealtimeEntry,
  cursor: string | null,
): Promise<boolean> {
  let pending: RealtimeMessage[] | null = [];

  const peer: RealtimePeer = {
    send: (message) => {
      if (pending) {
        pending.push(message);
        return;
      }

      sink.send([message]);
    },
    ping: () => sink.ping(),
    close: () => sink.close(),
  };

  // Every exit closes the sink, making its close handler the sole owner of
  // removing the peer.
  hub.subscribe(peer, entry.topic, Date.now());
  sink.onClosed(() => hub.remove(peer));

  const opening = await entry.open(cursor).catch((error: unknown) => {
    sink.close();
    throw error;
  });

  if (opening === null) {
    sink.close();
    return false;
  }

  const buffered = pending;

  // These operations must remain synchronous and adjacent so broadcasts cannot
  // overtake the buffered opening state.
  pending = null;
  sink.send([...opening, ...buffered]);

  return true;
}

function streamSink(stream: EventStream): RealtimeSink {
  return {
    send: (messages) =>
      void stream.push(
        messages.map((message) =>
          message.id
            ? { id: message.id, data: message.data }
            : { data: message.data },
        ),
      ),
    ping: () => void stream.pushComment("ping"),
    close: () => void stream.close(),
    onClosed: (listener) => stream.onClosed(listener),
  };
}

// Access denial leaves the response untouched for the caller.
export async function openRealtimeStream(
  h3Event: H3Event,
  entry: RealtimeEntry,
  cursor: string | null,
): Promise<EventStream | null> {
  const stream = createEventStream(h3Event);

  const attached = await attachRealtimeSubscription(
    realtimeHub,
    streamSink(stream),
    entry,
    cursor,
  );

  return attached ? stream : null;
}
