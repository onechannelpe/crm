import type { Topic } from "~/lib/realtime/topic";

import { createPgTopicBridge } from "./bridge";
import { TopicHub } from "./topic-hub";

interface TopicRealtimeChannelConfig<TEvent> {
  name: string;
  channel: string;
  parseEvent: (rawPayload: string) => TEvent | null;
  topicForEvent: (event: TEvent) => string;
  serializeEvent?: (event: TEvent) => string;
  reconcile?: (hub: TopicHub) => Promise<void>;
}

export function createTopicRealtimeChannel<TEvent>(
  config: TopicRealtimeChannelConfig<TEvent>,
): { hub: TopicHub; ensure: () => Promise<void> } {
  const hub = new TopicHub();
  const bridge = createPgTopicBridge({ ...config, hub });

  return {
    hub,
    ensure: () => bridge.start(),
  };
}

// LISTEN can miss events while reconnecting, so refresh every subscribed topic.
export function snapshotReconciler(
  topic: Topic,
  snapshotOf: (id: string) => Promise<string | null>,
): (hub: TopicHub) => Promise<void> {
  return async (hub) => {
    await Promise.all(
      hub.topics().map(async (subscribedTopic) => {
        const id = topic.parse(subscribedTopic);

        if (id === null) {
          return;
        }

        const snapshot = await snapshotOf(id);

        if (snapshot === null) {
          return;
        }

        hub.broadcast(subscribedTopic, snapshot);
      }),
    );
  };
}
