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

  return { hub, ensure: () => bridge.start() };
}
